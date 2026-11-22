const ROLES = Object.freeze({ CUSTOMER: 'customer', PROVIDER: 'provider', ADMIN: 'admin' });

const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

/** Statuses that hold (lock) a time slot. */
const ACTIVE_STATUSES = Object.freeze([APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED]);

/** Allowed state transitions of the appointment state machine. */
const STATUS_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
});

const NOTIFICATION_TYPES = Object.freeze([
  'welcome',
  'booking_created',
  'booking_request',
  'booking_confirmed',
  'booking_rejected',
  'booking_cancelled',
  'booking_rescheduled',
  'booking_completed',
  'account_status',
  'provider_approval',
]);

module.exports = { ROLES, APPOINTMENT_STATUS, ACTIVE_STATUSES, STATUS_TRANSITIONS, NOTIFICATION_TYPES };
