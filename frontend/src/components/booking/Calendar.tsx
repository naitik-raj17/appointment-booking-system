import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid } from '../../utils/calendar';
import { parseDateStr, todayStr } from '../../utils/format';

interface CalendarProps {
  value: string | null;
  onChange: (date: string) => void;
  isDisabled?: (date: string) => boolean;
  minDate?: string;
  maxDate?: string;
}

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function Calendar({ value, onChange, isDisabled, minDate, maxDate }: CalendarProps) {
  const initial = parseDateStr(value || minDate || todayStr());
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const cells = useMemo(() => monthGrid(view.year, view.month), [view]);
  const today = todayStr();

  const monthKey = (y: number, m: number) => y * 12 + m;
  const minKey = minDate ? monthKey(parseDateStr(minDate).getFullYear(), parseDateStr(minDate).getMonth()) : -Infinity;
  const maxKey = maxDate ? monthKey(parseDateStr(maxDate).getFullYear(), parseDateStr(maxDate).getMonth()) : Infinity;
  const current = monthKey(view.year, view.month);

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const label = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={current <= minKey} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <button type="button" onClick={() => shift(1)} disabled={current >= maxKey} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid">
        {cells.map((cell) => {
          const outOfRange = (minDate && cell.date < minDate) || (maxDate && cell.date > maxDate);
          const disabled = !cell.inMonth || Boolean(outOfRange) || Boolean(isDisabled?.(cell.date));
          const selected = value === cell.date;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={disabled}
              onClick={() => onChange(cell.date)}
              aria-pressed={selected}
              aria-label={parseDateStr(cell.date).toDateString()}
              className={`relative aspect-square rounded-lg text-sm transition-colors ${
                !cell.inMonth
                  ? 'invisible'
                  : selected
                    ? 'bg-brand-600 font-semibold text-white'
                    : disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : 'font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              {cell.day}
              {cell.date === today && !selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
