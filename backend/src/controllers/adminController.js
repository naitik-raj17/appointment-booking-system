const { User, ProviderProfile, Availability, Appointment, ActivityLog, Notification, Category, ROLES } = require('../models');
const ApiError = require('../utils/ApiError');
const { escapeRegex } = require('../algorithms/providerSearch');
const { buildListFilter, paginatedList } = require('./appointmentController');
const { notify } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');
const { addDays, todayStr, formatDate } = require('../utils/time');

async function stats(_req, res) {
  const today = todayStr();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 13);

  const [usersByRole, pendingProviders, byStatus, daily, byCategory, topProviders, revenue, categories, todayCount] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ProviderProfile.countDocuments({ isApproved: false }),
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Appointment.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }, count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $lookup: { from: 'providerprofiles', localField: 'providerProfile', foreignField: '_id', as: 'profile' } },
      { $unwind: '$profile' },
      { $group: { _id: '$profile.category', count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: '$provider', bookings: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0] } } } },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $lookup: { from: 'providerprofiles', localField: '_id', foreignField: 'user', as: 'profile' } },
      { $unwind: '$profile' },
      { $project: { _id: 0, id: '$_id', name: '$user.name', specialization: '$profile.specialization', rating: '$profile.ratingAverage', bookings: 1, revenue: 1 } },
    ]),
    Appointment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$price' } } }]),
    Category.find().select('name').lean(),
    Appointment.countDocuments({ date: today, status: { $in: ['pending', 'confirmed', 'completed'] } }),
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const roles = toMap(usersByRole);
  const statusMap = { pending: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0, ...toMap(byStatus) };
  const dailyMap = toMap(daily);
  const startStr = formatDate(since);
  const bookingsLast14Days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(startStr, i);
    return { date, count: dailyMap[date] || 0 };
  });
  const categoryNames = new Map(categories.map((c) => [String(c._id), c.name]));

  res.json({
    data: {
      users: { total: Object.values(roles).reduce((a, b) => a + b, 0), customers: roles.customer || 0, providers: roles.provider || 0, admins: roles.admin || 0 },
      pendingProviders,
      appointments: { total: Object.values(statusMap).reduce((a, b) => a + b, 0), today: todayCount, byStatus: statusMap },
      revenue: revenue[0] ? revenue[0].total : 0,
      bookingsLast14Days,
      bookingsByCategory: byCategory
        .map((c) => ({ category: categoryNames.get(String(c._id)) || 'Unknown', count: c.count }))
        .sort((a, b) => b.count - a.count),
      topProviders,
    },
  });
}

async function listUsers(req, res) {
  const { role, status, q, page, limit } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (status === 'pending') {
    const pendingIds = await ProviderProfile.find({ isApproved: false }).distinct('user');
    filter._id = { $in: pendingIds };
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const profiles = await ProviderProfile.find({ user: { $in: users.map((u) => u._id) } })
    .populate('category', 'name')
    .select('user isApproved specialization category city price ratingAverage')
    .lean();
  const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));
  const counts = await Appointment.aggregate([
    { $match: { $or: [{ customer: { $in: users.map((u) => u._id) } }, { provider: { $in: users.map((u) => u._id) } }] } },
    { $project: { ids: ['$customer', '$provider'] } },
    { $unwind: '$ids' },
    { $group: { _id: '$ids', count: { $sum: 1 } } },
  ]);
  const countByUser = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({
    data: users.map(({ password, __v, ...u }) => ({
      ...u,
      appointmentCount: countByUser.get(String(u._id)) || 0,
      providerProfile: profileByUser.get(String(u._id)) || null,
    })),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
    throw ApiError.badRequest('You cannot deactivate your own account', 'SELF_DEACTIVATE');
  }
  const statusChanged = req.body.isActive !== undefined && req.body.isActive !== user.isActive;
  Object.assign(user, req.body);
  await user.save();

  if (statusChanged) {
    await Promise.all([
      notify({
        user,
        type: 'account_status',
        title: user.isActive ? 'Account reactivated' : 'Account deactivated',
        message: user.isActive ? 'Your BookEase account has been reactivated.' : 'Your BookEase account has been deactivated by an administrator.',
      }),
      logActivity(req.user, user.isActive ? 'user.activated' : 'user.deactivated', { entityType: 'User', entityId: user._id, description: `${req.user.name} ${user.isActive ? 'activated' : 'deactivated'} ${user.name}` }),
    ]);
  } else {
    await logActivity(req.user, 'user.updated', { entityType: 'User', entityId: user._id, description: `${req.user.name} updated ${user.name}` });
  }
  res.json({ data: user });
}

async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === ROLES.ADMIN) throw ApiError.badRequest('Administrator accounts cannot be deleted', 'ADMIN_DELETE');
  const history = await Appointment.countDocuments({ $or: [{ customer: user._id }, { provider: user._id }] });
  if (history > 0) {
    throw ApiError.conflict('This user has appointment history. Deactivate the account instead to keep records consistent.', 'HAS_HISTORY');
  }
  await Promise.all([
    ProviderProfile.deleteOne({ user: user._id }),
    Availability.deleteOne({ provider: user._id }),
    Notification.deleteMany({ user: user._id }),
    user.deleteOne(),
  ]);
  await logActivity(req.user, 'user.deleted', { entityType: 'User', entityId: user._id, description: `${req.user.name} deleted ${user.name} (${user.email})` });
  res.json({ data: { id: user._id } });
}

async function setProviderApproval(req, res) {
  const profile = await ProviderProfile.findOne({ user: req.params.id }).populate('user', 'name email');
  if (!profile) throw ApiError.notFound('Provider not found');
  profile.isApproved = req.body.isApproved;
  await profile.save();
  await Promise.all([
    notify({
      user: profile.user,
      type: 'provider_approval',
      title: profile.isApproved ? 'Your profile is live' : 'Profile hidden from search',
      message: profile.isApproved
        ? 'An administrator approved your provider profile. Customers can now find and book you.'
        : 'An administrator has hidden your profile from search. Contact support for details.',
      link: '/provider',
    }),
    logActivity(req.user, profile.isApproved ? 'provider.approved' : 'provider.unapproved', { entityType: 'ProviderProfile', entityId: profile._id, description: `${req.user.name} ${profile.isApproved ? 'approved' : 'suspended'} provider ${profile.user.name}` }),
  ]);
  res.json({ data: profile });
}

async function listAppointments(req, res) {
  const filter = await buildListFilter({}, req.query);
  res.json(await paginatedList(filter, { ...req.query, sort: req.query.sort || 'desc' }));
}

async function listActivity(req, res) {
  const { page, limit } = req.query;
  const [items, total] = await Promise.all([
    ActivityLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'name email role').lean(),
    ActivityLog.countDocuments(),
  ]);
  res.json({ data: items, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

module.exports = { stats, listUsers, updateUser, deleteUser, setProviderApproval, listAppointments, listActivity };
