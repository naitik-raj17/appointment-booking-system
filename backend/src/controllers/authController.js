const { User, ProviderProfile, Availability, Category, ROLES } = require('../models');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../middleware/auth');
const { notify } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');

async function buildSession(user) {
  const profile =
    user.role === ROLES.PROVIDER
      ? await ProviderProfile.findOne({ user: user._id }).populate('category', 'name slug icon')
      : null;
  return { user: user.toJSON(), providerProfile: profile };
}

async function register(req, res) {
  const { name, email, password, phone, role, categoryId, specialization, city, price } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  if (role === ROLES.PROVIDER && !(await Category.exists({ _id: categoryId, isActive: true }))) {
    throw ApiError.badRequest('Please choose a valid category', 'INVALID_CATEGORY');
  }

  const user = await User.create({ name, email, password, phone, role });
  if (role === ROLES.PROVIDER) {
    try {
      await ProviderProfile.create({ user: user._id, category: categoryId, specialization, city, price });
      await Availability.create({ provider: user._id });
    } catch (err) {
      await Promise.all([User.deleteOne({ _id: user._id }), ProviderProfile.deleteOne({ user: user._id })]);
      throw err;
    }
  }

  await Promise.all([
    notify({
      user,
      type: 'welcome',
      title: 'Welcome to BookEase',
      message:
        role === ROLES.PROVIDER
          ? 'Your provider account was created. An administrator will review your profile shortly; meanwhile you can set your working hours.'
          : 'Your account is ready. Find a provider and book your first appointment in seconds.',
      link: role === ROLES.PROVIDER ? '/provider/availability' : '/providers',
    }),
    logActivity(user, 'user.registered', { entityType: 'User', entityId: user._id, description: `${name} registered as ${role}` }),
  ]);

  res.status(201).json({ data: { token: signToken(user), ...(await buildSession(user)) } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact support.', 'ACCOUNT_DISABLED');

  user.lastLoginAt = new Date();
  await user.save();
  await logActivity(user, 'user.login', { entityType: 'User', entityId: user._id, description: `${user.name} logged in` });

  res.json({ data: { token: signToken(user), ...(await buildSession(user)) } });
}

async function me(req, res) {
  res.json({ data: await buildSession(req.user) });
}

async function updateAccount(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ data: await buildSession(req.user) });
}

async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');
  }
  user.password = req.body.newPassword;
  await user.save();
  await logActivity(user, 'user.password_changed', { entityType: 'User', entityId: user._id, description: `${user.name} changed their password` });
  res.json({ data: { message: 'Password updated' } });
}

module.exports = { register, login, me, updateAccount, changePassword };
