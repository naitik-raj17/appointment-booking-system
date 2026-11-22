import { describe, expect, test } from 'vitest';
import { addDays, formatMoney, formatTime, hoursUntil, initials, timeAgo, toDateStr } from '../utils/format';
import { monthGrid } from '../utils/calendar';
import { isEmail, isValid, passwordError, phoneError } from '../utils/validation';
import { firstWorkingDate, makeDateFilter } from '../components/booking/availabilityRules';
import type { Availability } from '../types';

describe('format utils', () => {
  test('FT-01 formats 24h times as 12h', () => {
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('17:45')).toBe('5:45 PM');
  });

  test('FT-02 date arithmetic crosses month/year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('FT-03 helpers for display', () => {
    expect(initials('Dr. Sarah Mitchell')).toBe('SM');
    expect(formatMoney(80)).toBe('$80');
    const now = new Date('2026-10-30T10:00:00').getTime();
    expect(timeAgo('2026-10-30T09:58:00', now)).toBe('2m ago');
    expect(hoursUntil('2026-10-30', '12:00', new Date('2026-10-30T10:00:00'))).toBe(2);
  });
});

describe('calendar grid', () => {
  test('FT-04 builds a 6-week grid starting on Sunday', () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ date: '2026-11-01', day: 1, inMonth: true });
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });
});

describe('validation', () => {
  test('FT-05 validates email, password and phone', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(passwordError('short1')).toBeDefined();
    expect(passwordError('longpassword')).toBe('Must contain a number');
    expect(passwordError('Secret123')).toBeUndefined();
    expect(phoneError('+1 (555) 010-0100')).toBeUndefined();
    expect(phoneError('abc')).toBeDefined();
    expect(isValid({ a: undefined, b: '' })).toBe(true);
    expect(isValid({ a: 'error' })).toBe(false);
  });
});

describe('availability rules', () => {
  const availability: Availability = {
    slotDuration: 30,
    bufferMinutes: 0,
    weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isWorking: d === 1, startTime: '09:00', endTime: '17:00' })),
    blockedDates: [{ date: '2026-11-02', reason: 'Holiday' }],
  };

  test('FT-06 disables non-working weekdays and blocked dates', () => {
    const isDisabled = makeDateFilter(availability);
    expect(isDisabled('2026-11-09')).toBe(false); // Monday
    expect(isDisabled('2026-11-10')).toBe(true); // Tuesday off
    expect(isDisabled('2026-11-02')).toBe(true); // blocked Monday
  });

  test('FT-07 finds the first working date from today', () => {
    const d = firstWorkingDate(availability);
    expect(d).not.toBeNull();
    expect(new Date(`${d}T00:00:00`).getDay()).toBe(1);
  });
});
