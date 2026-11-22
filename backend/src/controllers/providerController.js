const mongoose = require('mongoose');
const { ProviderProfile, Availability, Appointment, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const { escapeRegex, rankProviders } = require('../algorithms/providerSearch');
const { computeSlots } = require('../services/bookingService');
const { logActivity } = require('../services/activityService');
const { todayStr } = require('../utils/time');

const toPublicProvider = (p) => ({
  id: String(p.user._id),
  profileId: String(p._id),
  name: p.user.name,
  specialization: p.specialization,
  bio: p.bio,
  experienceYears: p.experienceYears,
  city: p.city,
  address: p.address,
  price: p.price,
  currency: p.currency,
  tags: p.tags,
  ratingAverage: p.ratingAverage,
  ratingCount: p.ratingCount,
  category: p.category ? { id: String(p.category._id), name: p.category.name, slug: p.category.slug, icon: p.category.icon } : null,
  categoryName: p.category ? p.category.name : '',
});

async function search(req, res) {
  const { q, category, city, minPrice, maxPrice, minRating, sort, page, limit } = req.query;
  const filter = { isApproved: true };

  if (category) {
    const cat = await Category.findOne(
      mongoose.isValidObjectId(category) ? { _id: category } : { slug: category.toLowerCase() }
    ).select('_id');
    if (!cat) return res.json({ data: [], meta: { total: 0, page, limit, totalPages: 1 } });
    filter.category = cat._id;
  }
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}`, 'i');
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (minRating !== undefined) filter.ratingAverage = { $gte: minRating };

  const profiles = await ProviderProfile.find(filter)
    .populate({ path: 'user', select: 'name isActive', match: { isActive: true } })
    .populate('category', 'name slug icon isActive')
    .lean();

  const candidates = profiles.filter((p) => p.user && p.category && p.category.isActive).map(toPublicProvider);
  const result = rankProviders(candidates, { q, sort, page, limit });
  const items = result.items.map(({ categoryName, ...rest }) => rest);

  res.json({ data: items, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
}

async function getProvider(req, res) {
  const profile = await ProviderProfile.findOne({ user: req.params.id, isApproved: true })
    .populate({ path: 'user', select: 'name email phone isActive' })
    .populate('category', 'name slug icon')
    .lean();
  if (!profile || !profile.user || !profile.user.isActive) throw ApiError.notFound('Provider not found');

  const [availability, reviews, completedCount] = await Promise.all([
    Availability.findOne({ provider: req.params.id }).lean(),
    Appointment.find({ provider: req.params.id, rating: { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('customer', 'name')
      .select('rating review date customer')
      .lean(),
    Appointment.countDocuments({ provider: req.params.id, status: 'completed' }),
  ]);

  const today = todayStr();
  const { categoryName, ...provider } = toPublicProvider(profile);
  res.json({
    data: {
      ...provider,
      email: profile.user.email,
      phone: profile.user.phone,
      completedAppointments: completedCount,
      availability: availability && {
        slotDuration: availability.slotDuration,
        bufferMinutes: availability.bufferMinutes,
        weeklySchedule: availability.weeklySchedule,
        blockedDates: availability.blockedDates.filter((b) => b.date >= today),
      },
      reviews: reviews.map((r) => ({
        id: String(r._id),
        rating: r.rating,
        review: r.review,
        date: r.date,
        customerName: r.customer ? r.customer.name : 'Former customer',
      })),
    },
  });
}

async function getSlots(req, res) {
  const profile = await ProviderProfile.findOne({ user: req.params.id, isApproved: true }).select('_id');
  if (!profile) throw ApiError.notFound('Provider not found');
  res.json({ data: await computeSlots({ providerId: req.params.id, date: req.query.date }) });
}

async function getMyProfile(req, res) {
  const profile = await ProviderProfile.findOne({ user: req.user._id }).populate('category', 'name slug icon');
  if (!profile) throw ApiError.notFound('Provider profile not found');
  res.json({ data: profile });
}

async function updateMyProfile(req, res) {
  const { categoryId, ...rest } = req.body;
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Provider profile not found');
  if (categoryId) {
    if (!(await Category.exists({ _id: categoryId, isActive: true }))) throw ApiError.badRequest('Invalid category', 'INVALID_CATEGORY');
    profile.category = categoryId;
  }
  Object.assign(profile, rest);
  await profile.save();
  await logActivity(req.user, 'provider.profile_updated', { entityType: 'ProviderProfile', entityId: profile._id, description: `${req.user.name} updated their profile` });
  res.json({ data: await profile.populate('category', 'name slug icon') });
}

async function getMyAvailability(req, res) {
  let availability = await Availability.findOne({ provider: req.user._id });
  if (!availability) availability = await Availability.create({ provider: req.user._id });
  res.json({ data: availability });
}

async function updateMyAvailability(req, res) {
  const today = todayStr();
  const payload = {
    ...req.body,
    weeklySchedule: [...req.body.weeklySchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    blockedDates: req.body.blockedDates.filter((b) => b.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
  const availability = await Availability.findOneAndUpdate(
    { provider: req.user._id },
    { $set: payload },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Existing bookings are honoured even if they now fall outside working hours;
  // report them so the provider can decide whether to cancel.
  const affected = await Appointment.countDocuments({
    provider: req.user._id,
    isActive: true,
    date: { $in: payload.blockedDates.map((b) => b.date) },
  });

  await logActivity(req.user, 'provider.availability_updated', { entityType: 'Availability', entityId: availability._id, description: `${req.user.name} updated working hours` });
  res.json({ data: availability, meta: { activeAppointmentsOnBlockedDates: affected } });
}

module.exports = { search, getProvider, getSlots, getMyProfile, updateMyProfile, getMyAvailability, updateMyAvailability };
