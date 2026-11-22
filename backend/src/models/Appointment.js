const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, ACTIVE_STATUSES } = require('./constants');
const { TIME_RE, DATE_RE } = require('../utils/time');

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(APPOINTMENT_STATUS), required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 300, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true },
    date: { type: String, match: DATE_RE, required: true },
    startTime: { type: String, match: TIME_RE, required: true },
    endTime: { type: String, match: TIME_RE, required: true },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.PENDING,
    },
    /** true while the appointment holds its slot (pending/confirmed). Drives the partial unique indexes. */
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    price: { type: Number, min: 0, default: 0 },
    cancellationReason: { type: String, trim: true, maxlength: 300, default: '' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rescheduleCount: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true, maxlength: 500 },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Database-level double-booking guard: at most one ACTIVE appointment may hold a
// given provider start slot, and a customer cannot hold two active appointments
// that start at the same moment. Inserts/updates that violate these fail
// atomically with duplicate-key error E11000.
appointmentSchema.index(
  { provider: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: 'uniq_active_provider_slot' }
);
appointmentSchema.index(
  { customer: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: 'uniq_active_customer_slot' }
);
appointmentSchema.index({ provider: 1, date: 1, status: 1 });
appointmentSchema.index({ customer: 1, date: -1 });
appointmentSchema.index({ createdAt: -1 });

appointmentSchema.pre('validate', function syncActiveFlag(next) {
  this.isActive = ACTIVE_STATUSES.includes(this.status);
  next();
});

appointmentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
