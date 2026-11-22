const { z } = require('zod');
const mongoose = require('mongoose');
const { DATE_RE, TIME_RE, isValidDate } = require('./time');
const { SORT_OPTIONS } = require('../algorithms/providerSearch');

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
const date = z.string().regex(DATE_RE, 'Use YYYY-MM-DD').refine(isValidDate, 'Invalid date');
const time = z.string().regex(TIME_RE, 'Use HH:mm (24h)');
const optionalTime = z.union([time, z.literal(''), z.null()]).optional().transform((v) => v || undefined);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const phone = z.string().trim().max(30).regex(/^[+\d\s()-]*$/, 'Invalid phone number').optional().default('');
const page = z.coerce.number().int().min(1).default(1);
const limit = (max = 50, def = 10) => z.coerce.number().int().min(1).max(max).default(def);

const register = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(80),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password,
    phone,
    role: z.enum(['customer', 'provider']).default('customer'),
    categoryId: objectId.optional(),
    specialization: z.string().trim().max(100).optional(),
    city: z.string().trim().max(80).optional().default(''),
    price: z.coerce.number().min(0).max(100000).optional().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'provider') {
      if (!data.categoryId) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Category is required' });
      if (!data.specialization || data.specialization.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['specialization'], message: 'Specialization is required' });
      }
    }
  });

const login = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateAccount = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, 'Invalid phone number').optional(),
});

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

const providerSearch = z.object({
  q: z.string().trim().max(100).optional().default(''),
  category: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(SORT_OPTIONS).optional().default('relevance'),
  page,
  limit: limit(50, 12),
});

const providerProfile = z.object({
  categoryId: objectId.optional(),
  specialization: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(1500).optional(),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  price: z.coerce.number().min(0).max(100000).optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).optional(),
});

const daySchedule = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isWorking: z.boolean(),
    startTime: time,
    endTime: time,
    breakStart: optionalTime,
    breakEnd: optionalTime,
  })
  .superRefine((d, ctx) => {
    if (!d.isWorking) return;
    if (d.startTime >= d.endTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after start time' });
    if (Boolean(d.breakStart) !== Boolean(d.breakEnd)) {
      ctx.addIssue({ code: 'custom', path: ['breakEnd'], message: 'Provide both break start and end, or neither' });
    } else if (d.breakStart) {
      if (d.breakStart >= d.breakEnd) ctx.addIssue({ code: 'custom', path: ['breakEnd'], message: 'Break end must be after break start' });
      if (d.breakStart < d.startTime || d.breakEnd > d.endTime) {
        ctx.addIssue({ code: 'custom', path: ['breakStart'], message: 'Break must be within working hours' });
      }
    }
  });

const availability = z
  .object({
    slotDuration: z.number().int().min(10).max(240),
    bufferMinutes: z.number().int().min(0).max(120).default(0),
    weeklySchedule: z.array(daySchedule).length(7, 'Provide all 7 days'),
    blockedDates: z.array(z.object({ date, reason: z.string().trim().max(120).optional().default('') })).max(100).default([]),
  })
  .superRefine((a, ctx) => {
    const days = new Set(a.weeklySchedule.map((d) => d.dayOfWeek));
    if (days.size !== 7) ctx.addIssue({ code: 'custom', path: ['weeklySchedule'], message: 'Each weekday must appear exactly once' });
    const dates = a.blockedDates.map((b) => b.date);
    if (new Set(dates).size !== dates.length) ctx.addIssue({ code: 'custom', path: ['blockedDates'], message: 'Duplicate blocked date' });
  });

const slotsQuery = z.object({ date });

const createAppointment = z.object({
  providerId: objectId,
  date,
  startTime: time,
  notes: z.string().trim().max(500).optional().default(''),
});

const appointmentList = z.object({
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : undefined))
    .pipe(z.array(z.enum(['pending', 'confirmed', 'rejected', 'cancelled', 'completed'])).optional()),
  scope: z.enum(['upcoming', 'past', 'all']).optional().default('all'),
  from: date.optional(),
  to: date.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  page,
  limit: limit(100, 10),
});

const statusChange = z.object({
  status: z.enum(['confirmed', 'rejected', 'completed', 'cancelled']),
  reason: z.string().trim().max(300).optional().default(''),
});

const cancel = z.object({ reason: z.string().trim().max(300).optional().default('') });

const reschedule = z.object({ date, startTime: time });

const review = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(500).optional().default(''),
});

const category = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().default(''),
  icon: z.string().trim().max(40).optional().default('briefcase'),
  isActive: z.boolean().optional().default(true),
});

const adminUserList = z.object({
  role: z.enum(['customer', 'provider', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  q: z.string().trim().max(100).optional(),
  page,
  limit: limit(100, 10),
});

const adminUserUpdate = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

const approval = z.object({ isApproved: z.boolean() });

const pagination = z.object({ page, limit: limit(100, 20) });

const idParam = z.object({ id: objectId });

module.exports = {
  register,
  login,
  updateAccount,
  changePassword,
  providerSearch,
  providerProfile,
  availability,
  slotsQuery,
  createAppointment,
  appointmentList,
  statusChange,
  cancel,
  reschedule,
  review,
  category,
  adminUserList,
  adminUserUpdate,
  approval,
  pagination,
  idParam,
};
