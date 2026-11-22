/**
 * Appointment ordering. A stable merge sort keeps equal keys in their original
 * order (e.g. two appointments at the same time for different providers keep
 * their creation order), which Array#sort only guarantees since ES2019.
 */

function compareAppointments(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
  return 0;
}

/** Stable top-down merge sort. Time O(n log n), space O(n). */
function mergeSort(items, compare) {
  if (items.length <= 1) return items.slice();
  const mid = items.length >>> 1;
  const left = mergeSort(items.slice(0, mid), compare);
  const right = mergeSort(items.slice(mid), compare);
  const result = new Array(items.length);
  let i = 0;
  let j = 0;
  let k = 0;
  while (i < left.length && j < right.length) {
    result[k++] = compare(left[i], right[j]) <= 0 ? left[i++] : right[j++];
  }
  while (i < left.length) result[k++] = left[i++];
  while (j < right.length) result[k++] = right[j++];
  return result;
}

function sortAppointments(appointments, order = 'asc') {
  const direction = order === 'desc' ? -1 : 1;
  return mergeSort(appointments, (a, b) => direction * compareAppointments(a, b));
}

module.exports = { compareAppointments, mergeSort, sortAppointments };
