const env = require('../config/env');
const {
  Appointment,
  Availability,
  ProviderProfile,
  ACTIVE_STATUSES,
  STATUS_TRANSITIONS,
  APPOINTMENT_STATUS: S,
  ROLES,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { generateSlots } = require('../algorithms/slotGenerator');
const { mergeIntervals, hasConflict } = require('../algorithms/intervals');
const {
  isValidDate,
  isValidTime,
  toMinutes,
  todayStr,
  minutesOfDay,
  diffInDays,
  toDateTime,
} = require('../utils/time');
const { notify } = require('./notificationService');
const { logActivity } = require('./activityService');

const MAX_RESCHEDULES = 3;

const toInterval = (a) => ({ start: toMinutes(a.startTime), end: toMinutes(a.endTime) });
const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

function describeWhen(appt) {
  const when = toDateTime(appt.date, appt.startTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${when} at ${appt.startTime}`;
}

/** Translates duplicate-key errors from the partial unique indexes into domain errors. */
function translateDuplicateKey(err) {
  if (err && err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    if (keys.includes('customer')) {
      throw ApiError.conflict('You already have an appointment at this time', 'CUSTOMER_CONFLICT');
    }
    throw ApiError.conflict('This slot has just been booked by someone else. Please pick another time.', 'SLOT_TAKEN');
  }
  throw err;
}

async function loadBookableProvider(providerId) {
  const profile = await ProviderProfile.findOne({ user: providerId }).populate('user', 'name email isActive role');
  if (!profile || !profile.user || !profile.user.isActive || !profile.isApproved) {
    throw ApiError.notFound('Provider not found or not accepting bookings', 'PROVIDER_UNAVAILABLE');
  }
  return profile;
}

/**
 * Builds the slot list for one provider and date. Booked slots are returned
 * with status 'booked' so the UI can show them as taken.
 */
async function computeSlots({ providerId, date, now = new Date(), excludeAppointmentId }) {
  if (!isValidDate(date)) throw ApiError.badRequest('Date must be a valid YYYY-MM-DD value', 'INVALID_DATE');
  const today = todayStr(now);
  const base = { date, isWorkingDay: false, slotDuration: null, slots: [] };

  if (date < today) return { ...base, reason: 'This date is in the past' };
  if (diffInDays(today, date) > env.bookingHorizonDays) {
    return { ...base, reason: `Bookings open at most ${env.bookingHorizonDays} days in advance` };
  }

  const availability = await Availability.findOne({ provider: providerId });
  const day = availability && availability.getDaySchedule(date);
  if (!day) return { ...base, reason: 'The provider is not working on this day' };

  const filter = { provider: providerId, date, isActive: true };
  if (excludeAppointmentId) filter._id = { $ne: excludeAppointmentId };
  const booked = await Appointment.find(filter).select('startTime endTime').lean();

  const slots = generateSlots({
    ...day,
    slotDuration: availability.slotDuration,
    bufferMinutes: availability.bufferMinutes,
    booked: booked.map(toInterval),
    notBefore: date === today ? minutesOfDay(now) : -Infinity,
  });

  return { date, isWorkingDay: true, slotDuration: availability.slotDuration, slots };
}

/**
 * Server-side booking validation. Recomputes the slot grid instead of trusting
 * the client, then checks the customer's own calendar for overlaps.
 */
async function assertSlotBookable({ providerId, customerId, date, startTime, now = new Date(), excludeAppointmentId }) {
  if (!isValidTime(startTime)) throw ApiError.badRequest('Start time must be HH:mm', 'INVALID_TIME');

  const { isWorkingDay, slots, reason } = await computeSlots({ providerId, date, now, excludeAppointmentId });
  if (!isWorkingDay) throw ApiError.badRequest(reason, 'DAY_UNAVAILABLE');

  const slot = slots.find((s) => s.startTime === startTime);
  if (!slot) throw ApiError.badRequest('The selected time is not one of the provider\'s slots', 'INVALID_SLOT');
  if (slot.status === 'booked') throw ApiError.conflict('This slot is already booked', 'SLOT_TAKEN');
  if (slot.status === 'past') throw ApiError.badRequest('This slot is in the past', 'SLOT_IN_PAST');

  const ownFilter = { customer: customerId, date, isActive: true };
  if (excludeAppointmentId) ownFilter._id = { $ne: excludeAppointmentId };
  const own = await Appointment.find(ownFilter).select('startTime endTime').lean();
  const ownIntervals = mergeIntervals(own.map(toInterval));
  if (hasConflict(ownIntervals, toInterval(slot))) {
    throw ApiError.conflict('You already have another appointment that overlaps this time', 'CUSTOMER_CONFLICT');
  }

  return slot;
}

function assertOutsideChangeWindow(appt, now) {
  const msUntilStart = toDateTime(appt.date, appt.startTime) - now;
  if (msUntilStart < env.cancellationWindowHours * 3600 * 1000) {
    throw ApiError.badRequest(
      `Appointments can only be changed at least ${env.cancellationWindowHours} hour(s) before they start`,
      'CHANGE_WINDOW_CLOSED'
    );
  }
}

const populateAppointment = (query) =>
  query
    .populate('customer', 'name email phone')
    .populate('provider', 'name email phone')
    .populate({ path: 'providerProfile', select: 'specialization city address price currency category', populate: { path: 'category', select: 'name slug icon' } });

async function createAppointment({ customer, providerId, date, startTime, notes = '', now = new Date() }) {
  if (sameId(customer, providerId)) throw ApiError.badRequest('You cannot book yourself', 'SELF_BOOKING');
  const profile = await loadBookableProvider(providerId);
  const slot = await assertSlotBookable({ providerId, customerId: customer._id, date, startTime, now });

  let appointment;
  try {
    appointment = await Appointment.create({
      customer: customer._id,
      provider: providerId,
      providerProfile: profile._id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      notes,
      price: profile.price,
      statusHistory: [{ status: S.PENDING, changedBy: customer._id, note: 'Booking requested' }],
    });
  } catch (err) {
    translateDuplicateKey(err);
  }

  const when = describeWhen(appointment);
  await Promise.all([
    notify({
      user: customer,
      type: 'booking_created',
      title: 'Booking request sent',
      message: `Your appointment with ${profile.user.name} on ${when} is awaiting confirmation.`,
      link: '/customer/appointments',
      appointment: appointment._id,
    }),
    notify({
      user: profile.user,
      type: 'booking_request',
      title: 'New booking request',
      message: `${customer.name} requested an appointment on ${when}.`,
      link: '/provider/appointments',
      appointment: appointment._id,
    }),
    logActivity(customer, 'appointment.created', {
      entityType: 'Appointment',
      entityId: appointment._id,
      description: `${customer.name} booked ${profile.user.name} for ${when}`,
    }),
  ]);

  return populateAppointment(Appointment.findById(appointment._id));
}

/** Which target statuses each role may request (ownership is checked separately). */
const ROLE_PERMISSIONS = {
  [ROLES.CUSTOMER]: [S.CANCELLED],
  [ROLES.PROVIDER]: [S.CONFIRMED, S.REJECTED, S.COMPLETED, S.CANCELLED],
  [ROLES.ADMIN]: [S.CONFIRMED, S.REJECTED, S.COMPLETED, S.CANCELLED],
};

const STATUS_MESSAGES = {
  confirmed: { type: 'booking_confirmed', title: 'Appointment confirmed', verb: 'confirmed' },
  rejected: { type: 'booking_rejected', title: 'Appointment declined', verb: 'declined' },
  cancelled: { type: 'booking_cancelled', title: 'Appointment cancelled', verb: 'cancelled' },
  completed: { type: 'booking_completed', title: 'Appointment completed', verb: 'marked as completed' },
};

async function loadOwnedAppointment(appointmentId, actor) {
  const appt = await Appointment.findById(appointmentId).populate('customer', 'name email').populate('provider', 'name email');
  if (!appt) throw ApiError.notFound('Appointment not found');
  const isOwner = sameId(appt.customer, actor) || sameId(appt.provider, actor);
  if (!isOwner && actor.role !== ROLES.ADMIN) throw ApiError.notFound('Appointment not found');
  return appt;
}

/**
 * Applies a state-machine transition with an optimistic-concurrency guard:
 * the update only matches if the status is still the one we validated
 * against, so two conflicting actions (e.g. cancel vs. confirm) cannot both win.
 */
async function changeStatus({ appointmentId, actor, status, reason = '', now = new Date() }) {
  const appt = await loadOwnedAppointment(appointmentId, actor);
  const isAdmin = actor.role === ROLES.ADMIN;
  const actingAs = isAdmin ? ROLES.ADMIN : sameId(appt.provider, actor) ? ROLES.PROVIDER : ROLES.CUSTOMER;

  if (!ROLE_PERMISSIONS[actingAs].includes(status)) {
    throw ApiError.forbidden(`A ${actingAs} cannot set an appointment to ${status}`);
  }
  if (!STATUS_TRANSITIONS[appt.status].includes(status)) {
    throw ApiError.badRequest(`A ${appt.status} appointment cannot be ${status}`, 'INVALID_TRANSITION');
  }

  const startsAt = toDateTime(appt.date, appt.startTime);
  if (status === S.CANCELLED && actingAs === ROLES.CUSTOMER) assertOutsideChangeWindow(appt, now);
  if (status === S.COMPLETED && startsAt > now) {
    throw ApiError.badRequest('An appointment can only be completed after it has started', 'NOT_STARTED');
  }
  if (status === S.CONFIRMED && startsAt <= now) {
    throw ApiError.badRequest('This appointment time has already passed', 'IN_PAST');
  }

  const set = { status, isActive: ACTIVE_STATUSES.includes(status) };
  if (status === S.CANCELLED) {
    set.cancellationReason = reason;
    set.cancelledBy = actor._id;
  }
  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: appt.status },
    { $set: set, $push: { statusHistory: { status, changedBy: actor._id, note: reason } } },
    { new: true }
  );
  if (!updated) {
    throw ApiError.conflict('This appointment was changed by someone else. Please refresh and try again.', 'STALE_STATE');
  }

  const msg = STATUS_MESSAGES[status];
  const when = describeWhen(appt);
  const reasonText = reason ? ` Reason: ${reason}` : '';
  const recipients = [];
  if (actingAs !== ROLES.CUSTOMER) {
    recipients.push({
      user: appt.customer,
      message:
        status === S.COMPLETED
          ? `Your appointment with ${appt.provider.name} on ${when} is complete. You can now leave a rating.`
          : `Your appointment with ${appt.provider.name} on ${when} was ${msg.verb}.${reasonText}`,
      link: '/customer/appointments',
    });
  }
  if (actingAs !== ROLES.PROVIDER && status === S.CANCELLED) {
    recipients.push({
      user: appt.provider,
      message: `The appointment with ${appt.customer.name} on ${when} was cancelled.${reasonText}`,
      link: '/provider/appointments',
    });
  }

  await Promise.all([
    ...recipients.map((r) => notify({ ...r, type: msg.type, title: msg.title, appointment: appt._id })),
    logActivity(actor, `appointment.${status}`, {
      entityType: 'Appointment',
      entityId: appt._id,
      description: `${actor.name} ${msg.verb} the appointment of ${appt.customer.name} with ${appt.provider.name} (${when})`,
    }),
  ]);

  return populateAppointment(Appointment.findById(updated._id));
}

async function rescheduleAppointment({ appointmentId, actor, date, startTime, now = new Date() }) {
  const appt = await loadOwnedAppointment(appointmentId, actor);
  if (!sameId(appt.customer, actor)) throw ApiError.forbidden('Only the customer can reschedule an appointment');
  if (!ACTIVE_STATUSES.includes(appt.status)) {
    throw ApiError.badRequest(`A ${appt.status} appointment cannot be rescheduled`, 'INVALID_TRANSITION');
  }
  if (appt.rescheduleCount >= MAX_RESCHEDULES) {
    throw ApiError.badRequest(`An appointment can be rescheduled at most ${MAX_RESCHEDULES} times`, 'RESCHEDULE_LIMIT');
  }
  if (appt.date === date && appt.startTime === startTime) {
    throw ApiError.badRequest('Please choose a different time', 'SAME_SLOT');
  }
  assertOutsideChangeWindow(appt, now);
  await loadBookableProvider(appt.provider._id);

  const slot = await assertSlotBookable({
    providerId: appt.provider._id,
    customerId: actor._id,
    date,
    startTime,
    now,
    excludeAppointmentId: appt._id,
  });

  const previous = describeWhen(appt);
  let updated;
  try {
    updated = await Appointment.findOneAndUpdate(
      { _id: appt._id, status: appt.status, date: appt.date, startTime: appt.startTime },
      {
        $set: { date, startTime: slot.startTime, endTime: slot.endTime, status: S.PENDING, isActive: true },
        $inc: { rescheduleCount: 1 },
        $push: { statusHistory: { status: S.PENDING, changedBy: actor._id, note: `Rescheduled from ${previous}` } },
      },
      { new: true }
    );
  } catch (err) {
    translateDuplicateKey(err);
  }
  if (!updated) {
    throw ApiError.conflict('This appointment was changed by someone else. Please refresh and try again.', 'STALE_STATE');
  }

  const when = describeWhen(updated);
  await Promise.all([
    notify({
      user: appt.provider,
      type: 'booking_rescheduled',
      title: 'Appointment rescheduled',
      message: `${appt.customer.name} moved their appointment from ${previous} to ${when}. Please confirm the new time.`,
      link: '/provider/appointments',
      appointment: appt._id,
    }),
    notify({
      user: appt.customer,
      type: 'booking_rescheduled',
      title: 'Reschedule requested',
      message: `Your appointment with ${appt.provider.name} was moved to ${when} and is awaiting confirmation.`,
      link: '/customer/appointments',
      appointment: appt._id,
    }),
    logActivity(actor, 'appointment.rescheduled', {
      entityType: 'Appointment',
      entityId: appt._id,
      description: `${actor.name} rescheduled with ${appt.provider.name}: ${previous} → ${when}`,
    }),
  ]);

  return populateAppointment(Appointment.findById(updated._id));
}

async function reviewAppointment({ appointmentId, actor, rating, review = '' }) {
  const appt = await Appointment.findById(appointmentId);
  if (!appt || !sameId(appt.customer, actor)) throw ApiError.notFound('Appointment not found');
  if (appt.status !== S.COMPLETED) throw ApiError.badRequest('Only completed appointments can be rated', 'NOT_COMPLETED');

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, rating: { $exists: false } },
    { $set: { rating, review } },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('You have already rated this appointment', 'ALREADY_REVIEWED');

  await ProviderProfile.applyRating(appt.providerProfile, rating);
  await logActivity(actor, 'appointment.reviewed', {
    entityType: 'Appointment',
    entityId: appt._id,
    description: `${actor.name} rated an appointment ${rating}/5`,
  });
  return populateAppointment(Appointment.findById(updated._id));
}

module.exports = {
  MAX_RESCHEDULES,
  computeSlots,
  assertSlotBookable,
  createAppointment,
  changeStatus,
  rescheduleAppointment,
  reviewAppointment,
  populateAppointment,
  loadOwnedAppointment,
};
