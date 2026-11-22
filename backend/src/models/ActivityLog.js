const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true, maxlength: 60 },
    entityType: { type: String, maxlength: 40, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
