const { Notification, User } = require('../models');
const { sendEmail } = require('./emailService');

/**
 * Creates an in-app notification and dispatches the matching email
 * asynchronously. Email failures never break the business operation; the
 * outcome is recorded on the notification (emailStatus).
 */
async function notify({ user, type, title, message, link = '', appointment }) {
  const recipient = user && user.email ? user : await User.findById(user).select('name email');
  if (!recipient) return null;

  const notification = await Notification.create({
    user: recipient._id,
    type,
    title,
    message,
    link,
    appointment,
  });

  sendEmail({ to: recipient.email, name: recipient.name, subject: title, message, link })
    .then((status) => Notification.updateOne({ _id: notification._id }, { emailStatus: status }))
    .catch((err) => {
      console.error(`[email] failed for ${recipient.email}: ${err.message}`);
      return Notification.updateOne({ _id: notification._id }, { emailStatus: 'failed' });
    })
    .catch(() => {});

  return notification;
}

module.exports = { notify };
