import type { Availability } from '../../types';
import { addDays, parseDateStr, todayStr } from '../../utils/format';

export const BOOKING_HORIZON_DAYS = 60;

export function bookingRange() {
  const min = todayStr();
  return { min, max: addDays(min, BOOKING_HORIZON_DAYS) };
}

/** Client-side hint of which dates have working hours; the server remains the source of truth. */
export function makeDateFilter(availability: Availability | null | undefined) {
  return (date: string) => {
    if (!availability) return true;
    if (availability.blockedDates.some((b) => b.date === date)) return true;
    const day = availability.weeklySchedule.find((d) => d.dayOfWeek === parseDateStr(date).getDay());
    return !day || !day.isWorking;
  };
}

/** First bookable date from today, used as the calendar's default selection. */
export function firstWorkingDate(availability: Availability | null | undefined) {
  const isDisabled = makeDateFilter(availability);
  const { min } = bookingRange();
  for (let i = 0; i <= BOOKING_HORIZON_DAYS; i += 1) {
    const d = addDays(min, i);
    if (!isDisabled(d)) return d;
  }
  return null;
}
