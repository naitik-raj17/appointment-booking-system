const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

/**
 * Uses real SMTP when SMTP_HOST is configured; otherwise a JSON transport that
 * renders the message without sending it (development / demo mode).
 */
function getTransporter() {
  if (transporter) return transporter;
  if (env.smtp.host) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderTemplate({ name, title, message, link }) {
  const url = link ? `${env.clientUrl}${link}` : env.clientUrl;
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#4f46e5;color:#fff;padding:20px 28px;font-size:20px;font-weight:bold">BookEase</td></tr>
    <tr><td style="padding:28px;color:#0f172a">
      <p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
      <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h2>
      <p style="margin:0 0 24px;line-height:1.5;color:#334155">${escapeHtml(message)}</p>
      <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Open BookEase</a>
    </td></tr>
    <tr><td style="padding:16px 28px;color:#64748b;font-size:12px">You received this email because you have an account on BookEase.</td></tr>
  </table></td></tr></table></body></html>`;
}

/** Sends one email. Resolves to 'sent' | 'skipped'; rejects on transport failure. */
async function sendEmail({ to, name, subject, message, link }) {
  if (env.isTest) return 'skipped';
  const info = await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: `BookEase: ${subject}`,
    text: `Hi ${name},\n\n${message}\n\n${env.clientUrl}${link || ''}`,
    html: renderTemplate({ name, title: subject, message, link }),
  });
  if (!env.smtp.host) {
    console.log(`[email:dev] to=${to} subject="${subject}" (set SMTP_HOST to deliver real email)`);
    return 'skipped';
  }
  console.log(`[email] sent to=${to} id=${info.messageId}`);
  return 'sent';
}

module.exports = { sendEmail, renderTemplate };
