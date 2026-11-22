import { toDateStr } from './format';

export interface CalendarCell {
  date: string;
  day: number;
  inMonth: boolean;
}

/** 6×7 grid of dates for the month containing `year`/`month` (0-based), weeks start on Sunday. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: toDateStr(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}
