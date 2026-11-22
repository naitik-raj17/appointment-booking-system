const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const h = require('../utils/asyncHandler');
const v = require('../utils/validators');
const auth = require('../controllers/authController');
const providers = require('../controllers/providerController');
const appointments = require('../controllers/appointmentController');
const notifications = require('../controllers/notificationController');
const categories = require('../controllers/categoryController');
const admin = require('../controllers/adminController');

const router = express.Router();
const id = validate(v.idParam, 'params');
const customer = [authenticate, authorize('customer')];
const provider = [authenticate, authorize('provider')];
const adminOnly = [authenticate, authorize('admin')];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later', code: 'RATE_LIMITED' } },
});

router.get('/health', (_req, res) => res.json({ data: { status: 'ok', time: new Date().toISOString() } }));

// Auth & account
router.post('/auth/register', authLimiter, validate(v.register), h(auth.register));
router.post('/auth/login', authLimiter, validate(v.login), h(auth.login));
router.get('/auth/me', authenticate, h(auth.me));
router.put('/auth/me', authenticate, validate(v.updateAccount), h(auth.updateAccount));
router.put('/auth/password', authenticate, validate(v.changePassword), h(auth.changePassword));

// Categories (public)
router.get('/categories', h(categories.listPublic));

// Providers — "/me" routes are registered before "/:id"
router.get('/providers', validate(v.providerSearch, 'query'), h(providers.search));
router.get('/providers/me/profile', provider, h(providers.getMyProfile));
router.put('/providers/me/profile', provider, validate(v.providerProfile), h(providers.updateMyProfile));
router.get('/providers/me/availability', provider, h(providers.getMyAvailability));
router.put('/providers/me/availability', provider, validate(v.availability), h(providers.updateMyAvailability));
router.get('/providers/:id', id, h(providers.getProvider));
router.get('/providers/:id/slots', id, validate(v.slotsQuery, 'query'), h(providers.getSlots));

// Appointments
router.get('/appointments', authenticate, validate(v.appointmentList, 'query'), h(appointments.list));
router.get('/appointments/summary', authenticate, h(appointments.summary));
router.post('/appointments', customer, validate(v.createAppointment), h(appointments.create));
router.get('/appointments/:id', authenticate, id, h(appointments.getOne));
router.patch('/appointments/:id/cancel', authenticate, id, validate(v.cancel), h(appointments.cancel));
router.patch('/appointments/:id/status', authenticate, authorize('provider', 'admin'), id, validate(v.statusChange), h(appointments.updateStatus));
router.patch('/appointments/:id/reschedule', customer, id, validate(v.reschedule), h(appointments.reschedule));
router.post('/appointments/:id/review', customer, id, validate(v.review), h(appointments.review));

// Notifications
router.get('/notifications', authenticate, validate(v.pagination, 'query'), h(notifications.list));
router.patch('/notifications/read-all', authenticate, h(notifications.markAllRead));
router.patch('/notifications/:id/read', authenticate, id, h(notifications.markRead));

// Administration
router.get('/admin/stats', adminOnly, h(admin.stats));
router.get('/admin/users', adminOnly, validate(v.adminUserList, 'query'), h(admin.listUsers));
router.patch('/admin/users/:id', adminOnly, id, validate(v.adminUserUpdate), h(admin.updateUser));
router.delete('/admin/users/:id', adminOnly, id, h(admin.deleteUser));
router.patch('/admin/providers/:id/approval', adminOnly, id, validate(v.approval), h(admin.setProviderApproval));
router.get('/admin/appointments', adminOnly, validate(v.appointmentList, 'query'), h(admin.listAppointments));
router.get('/admin/activity', adminOnly, validate(v.pagination, 'query'), h(admin.listActivity));
router.get('/admin/categories', adminOnly, h(categories.listAll));
router.post('/admin/categories', adminOnly, validate(v.category), h(categories.create));
router.put('/admin/categories/:id', adminOnly, id, validate(v.category), h(categories.update));
router.delete('/admin/categories/:id', adminOnly, id, h(categories.remove));

module.exports = router;
