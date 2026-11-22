const mongoose = require('mongoose');
const { Appointment, User, ROLES, ACTIVE_STATUSES } = require('../models');
const booking = require('../services/bookingService');
const { sortAppointments } = require('../algorithms/sorting');
const { escapeRegex } = require('../algorithms/providerSearch');
const { todayStr, toHHMM, minutesOfDay } = require('../utils/time');

/** Mongo filter fragments for "upcoming" vs "past" relative to now. */
function timeScopeFilter(scope, now = new Date()) {
  const today = todayStr(now);
  const nowHHMM = toHHMM(minutesOfDay(now));
  if (scope === 'upcoming') return { $or: [{ date: { $gt: today } }, { date: today, endTime: { $gt: nowHHMM } }] };
  if (scope === 'past') return { $or: [{ date: { $lt: today } }, { date: today, endTime: { $lte: nowHHMM } }] };
  return {};
}

/** Builds the list query; `ownerFilter` restricts rows to what the caller may see. */
async function buildListFilter(ownerFilter, { status, scope, from, to, q }) {
  const and = [ownerFilter, timeScopeFilter(scope)];
  if (status && status.length) and.push({ status: { $in: status } });
  if (from || to) and.push({ date: { ...(from && { $gte: from }), ...(to && { $lte: to }) } });
  if (q) {
    const users = await User.find({ name: new RegExp(escapeRegex(q), 'i') }).select('_id').lean();
    const ids = users.map((u) => u._id);
    and.push({ $or: [{ customer: { $in: ids } }, { provider: { $in: ids } }] });
  }
  return { $and: and.filter((f) => Object.keys(f).length) };
}

async function paginatedList(filter, { page, limit, sort, scope }) {
  const direction = (sort || (scope === 'upcoming' ? 'asc' : 'desc')) === 'asc' ? 1 : -1;
  const [items, total] = await Promise.all([
    booking
      .populateAppointment(Appointment.find(filter))
      .sort({ date: direction, startTime: direction, _id: direction })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);
  return { data: items, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

function ownerFilterFor(user) {
  if (user.role === ROLES.CUSTOMER) return { customer: user._id };
  if (user.role === ROLES.PROVIDER) return { provider: user._id };
  return {};
}

async function list(req, res) {
  const filter = await buildListFilter(ownerFilterFor(req.user), req.query);
  res.json(await paginatedList(filter, req.query));
}

/** Dashboard summary: counts per status, the next active appointments, and today's agenda. */
async function summary(req, res) {
  const owner = ownerFilterFor(req.user);
  const ownerMatch = Object.fromEntries(Object.entries(owner).map(([k, v]) => [k, new mongoose.Types.ObjectId(String(v))]));
  const today = todayStr();

  const [counts, upcomingRaw, todayRaw] = await Promise.all([
    Appointment.aggregate([{ $match: ownerMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    booking
      .populateAppointment(Appointment.find({ ...owner, ...timeScopeFilter('upcoming'), status: { $in: ACTIVE_STATUSES } }))
      .sort({ date: 1, startTime: 1 })
      .limit(5)
      .lean(),
    booking.populateAppointment(Appointment.find({ ...owner, date: today, status: { $in: [...ACTIVE_STATUSES, 'completed'] } })).lean(),
  ]);

  const byStatus = { pending: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0 };
  counts.forEach((c) => {
    byStatus[c._id] = c.count;
  });

  res.json({
    data: {
      byStatus,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      upcoming: upcomingRaw,
      today: sortAppointments(todayRaw),
    },
  });
}

async function getOne(req, res) {
  await booking.loadOwnedAppointment(req.params.id, req.user);
  const appt = await booking.populateAppointment(Appointment.findById(req.params.id)).lean();
  res.json({ data: appt });
}

async function create(req, res) {
  const appointment = await booking.createAppointment({ customer: req.user, ...req.body });
  res.status(201).json({ data: appointment });
}

async function cancel(req, res) {
  const appointment = await booking.changeStatus({ appointmentId: req.params.id, actor: req.user, status: 'cancelled', reason: req.body.reason });
  res.json({ data: appointment });
}

async function updateStatus(req, res) {
  const appointment = await booking.changeStatus({ appointmentId: req.params.id, actor: req.user, ...req.body });
  res.json({ data: appointment });
}

async function reschedule(req, res) {
  const appointment = await booking.rescheduleAppointment({ appointmentId: req.params.id, actor: req.user, ...req.body });
  res.json({ data: appointment });
}

async function review(req, res) {
  const appointment = await booking.reviewAppointment({ appointmentId: req.params.id, actor: req.user, ...req.body });
  res.json({ data: appointment });
}

module.exports = { list, summary, getOne, create, cancel, updateStatus, reschedule, review, buildListFilter, paginatedList };
