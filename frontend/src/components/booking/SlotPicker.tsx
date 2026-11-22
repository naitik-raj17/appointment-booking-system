import { CalendarOff } from 'lucide-react';
import { providerApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { formatDate, formatTime } from '../../utils/format';
import { ErrorState, Skeleton } from '../ui';

interface SlotPickerProps {
  providerId: string;
  date: string;
  value: string | null;
  onChange: (startTime: string) => void;
  /** Bumped by the parent to force a refetch (e.g. after a conflict). */
  refreshKey?: number;
}

export function SlotPicker({ providerId, date, value, onChange, refreshKey = 0 }: SlotPickerProps) {
  const { data, loading, error, reload } = useAsync(() => providerApi.slots(providerId, date), [providerId, date, refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || !data.isWorkingDay || data.slots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500">
        <CalendarOff className="h-6 w-6 text-slate-400" />
        {data?.reason || 'No slots on this day.'}
      </div>
    );
  }

  const available = data.slots.filter((s) => s.status === 'available').length;
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })} · {available} of {data.slots.length} slots free · {data.slotDuration} min each
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {data.slots.map((slot) => {
          const isFree = slot.status === 'available';
          const selected = value === slot.startTime;
          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={!isFree}
              onClick={() => onChange(slot.startTime)}
              title={isFree ? `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}` : slot.status === 'booked' ? 'Already booked' : 'Time has passed'}
              className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                selected
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : isFree
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-700'
                    : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
              }`}
            >
              {formatTime(slot.startTime)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
