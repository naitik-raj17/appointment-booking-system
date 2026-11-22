const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('./constants');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 1000 },
    link: { type: String, default: '' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    isRead: { type: Boolean, default: false },
    emailStatus: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
