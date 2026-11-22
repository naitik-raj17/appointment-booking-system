/**
 * Date/time helpers. Dates are stored as 'YYYY-MM-DD' strings and times as
 * 'HH:mm' strings in the provider's local (server) time zone, which keeps
 * slot arithmetic in plain integer minutes.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n) => String(n).padStart(2, '0');

function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayOfWeek(dateStr) {
  return parseDate(dateStr).getDay();
}

function addDays(dateStr, days) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function todayStr(now = new Date()) {
  return formatDate(now);
}

function minutesOfDay(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

/** Converts an appointment's date + start time into a JS Date (local time). */
function toDateTime(dateStr, time) {
  const date = parseDate(dateStr);
  const mins = toMinutes(time);
  date.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return date;
}

function diffInDays(fromStr, toStr) {
  return Math.round((parseDate(toStr) - parseDate(fromStr)) / 86400000);
}

module.exports = {
  DATE_RE,
  TIME_RE,
  isValidTime,
  isValidDate,
  toMinutes,
  toHHMM,
  formatDate,
  parseDate,
  dayOfWeek,
  addDays,
  todayStr,
  minutesOfDay,
  toDateTime,
  diffInDays,
};
