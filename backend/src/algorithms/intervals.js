/**
 * Interval algorithms used for conflict detection.
 * An interval is { start, end } in minutes since midnight, half-open: [start, end).
 */

/** Two half-open intervals overlap iff each starts before the other ends. O(1) */
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Sorts intervals by start and merges overlapping/touching ones.
 * Time O(n log n), space O(n).
 */
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

/**
 * Binary search conflict check against a sorted, non-overlapping interval list.
 * Finds the first interval whose end is after candidate.start; the candidate
 * conflicts iff that interval starts before candidate.end.
 * Time O(log n), space O(1).
 */
function hasConflict(sortedIntervals, candidate) {
  let lo = 0;
  let hi = sortedIntervals.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedIntervals[mid].end <= candidate.start) lo = mid + 1;
    else hi = mid;
  }
  return lo < sortedIntervals.length && sortedIntervals[lo].start < candidate.end;
}

/**
 * Sweep-line detection of every overlapping pair in an arbitrary list.
 * Time O(n log n + k) where k is the number of reported pairs.
 */
function findOverlappingPairs(intervals) {
  const sorted = intervals
    .map((interval, index) => ({ ...interval, index }))
    .sort((a, b) => a.start - b.start);
  const pairs = [];
  const active = [];
  for (const current of sorted) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= current.start) active.splice(i, 1);
    }
    for (const other of active) pairs.push([other.index, current.index]);
    active.push(current);
  }
  return pairs;
}

module.exports = { overlaps, mergeIntervals, hasConflict, findOverlappingPairs };
