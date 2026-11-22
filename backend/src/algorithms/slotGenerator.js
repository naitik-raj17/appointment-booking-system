const { mergeIntervals } = require('./intervals');
const { toHHMM } = require('../utils/time');

/**
 * Generates bookable slots for one working day using a single forward sweep.
 *
 * @param {object} opts
 * @param {number} opts.dayStart       working day start (minutes)
 * @param {number} opts.dayEnd         working day end (minutes)
 * @param {number} opts.slotDuration   slot length (minutes)
 * @param {number} [opts.bufferMinutes=0] gap inserted after every slot
 * @param {{start:number,end:number}[]} [opts.breaks]  provider breaks (slots hidden)
 * @param {{start:number,end:number}[]} [opts.booked]  active bookings (slots shown as booked)
 * @param {number} [opts.notBefore]    earliest bookable minute (e.g. "now" for today)
 * @returns {{startTime:string,endTime:string,status:'available'|'booked'|'past'}[]}
 *
 * Time O(S + B log B) where S = number of candidate slots and B = breaks + bookings
 * (the sort inside mergeIntervals); the sweep itself is linear because both
 * pointers only move forward. Space O(S + B).
 */
function generateSlots({
  dayStart,
  dayEnd,
  slotDuration,
  bufferMinutes = 0,
  breaks = [],
  booked = [],
  notBefore = -Infinity,
}) {
  if (!(slotDuration > 0) || dayEnd <= dayStart) return [];

  const mergedBreaks = mergeIntervals(breaks);
  const mergedBooked = mergeIntervals(booked);
  const step = slotDuration + bufferMinutes;
  const slots = [];
  let b = 0;
  let k = 0;

  for (let start = dayStart; start + slotDuration <= dayEnd; start += step) {
    const end = start + slotDuration;

    while (b < mergedBreaks.length && mergedBreaks[b].end <= start) b += 1;
    if (b < mergedBreaks.length && mergedBreaks[b].start < end) continue;

    while (k < mergedBooked.length && mergedBooked[k].end <= start) k += 1;
    const isBooked = k < mergedBooked.length && mergedBooked[k].start < end;

    let status = 'available';
    if (isBooked) status = 'booked';
    else if (start < notBefore) status = 'past';

    slots.push({ startTime: toHHMM(start), endTime: toHHMM(end), status });
  }

  return slots;
}

module.exports = { generateSlots };
