const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');

async function list(req, res) {
  const { page, limit } = req.query;
  const filter = { user: req.user._id };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);
  res.json({ data: items, meta: { total, unread, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ data: n });
}

async function markAllRead(req, res) {
  const result = await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ data: { updated: result.modifiedCount } });
}

module.exports = { list, markRead, markAllRead };
