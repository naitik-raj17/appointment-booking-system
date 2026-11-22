const mongoose = require('mongoose');
const { TIME_RE, DATE_RE, toMinutes, dayOfWeek } = require('../utils/time');

const dayScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    isWorking: { type: Boolean, default: false },
    startTime: { type: String, match: TIME_RE, default: '09:00' },
    endTime: { type: String, match: TIME_RE, default: '17:00' },
    breakStart: { type: String, match: TIME_RE },
    breakEnd: { type: String, match: TIME_RE },
  },
  { _id: false }
);

const blockedDateSchema = new mongoose.Schema(
  {
    date: { type: String, match: DATE_RE, required: true },
    reason: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    slotDuration: { type: Number, min: 10, max: 240, default: 30 },
    bufferMinutes: { type: Number, min: 0, max: 120, default: 0 },
    weeklySchedule: { type: [dayScheduleSchema], default: () => Availability.defaultWeek() },
    blockedDates: { type: [blockedDateSchema], default: [] },
  },
  { timestamps: true }
);

/** Default schedule: Monday–Friday 09:00–17:00 with a 13:00–14:00 lunch break. */
availabilitySchema.statics.defaultWeek = () =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dayOfWeek: d,
    isWorking: d >= 1 && d <= 5,
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
  }));

/**
 * Resolves the working window for a concrete date, or null if the provider
 * does not work that day (weekly day off or blocked date).
 */
availabilitySchema.methods.getDaySchedule = function getDaySchedule(dateStr) {
  if (this.blockedDates.some((b) => b.date === dateStr)) return null;
  const day = this.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek(dateStr));
  if (!day || !day.isWorking) return null;
  const breaks = [];
  if (day.breakStart && day.breakEnd && day.breakStart < day.breakEnd) {
    breaks.push({ start: toMinutes(day.breakStart), end: toMinutes(day.breakEnd) });
  }
  return { dayStart: toMinutes(day.startTime), dayEnd: toMinutes(day.endTime), breaks };
};

const Availability = mongoose.model('Availability', availabilitySchema);
module.exports = Availability;
