const { ActivityLog } = require('../models');

/** Appends an audit entry. Logging failures are swallowed so they never block a request. */
async function logActivity(actor, action, { entityType = '', entityId, description = '' } = {}) {
  try {
    await ActivityLog.create({
      actor: actor ? actor._id : undefined,
      actorRole: actor ? actor.role : 'system',
      action,
      entityType,
      entityId,
      description,
    });
  } catch (err) {
    console.error('[activity] failed to log', err.message);
  }
}

module.exports = { logActivity };
