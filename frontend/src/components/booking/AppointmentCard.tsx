import { useState, type ReactNode } from 'react';
import { CalendarDays, ChevronDown, Clock, MapPin, MessageSquare, Star } from 'lucide-react';
import type { Appointment } from '../../types';
import { formatDate, formatDateTime, formatMoney, formatTime, STATUS_LABEL } from '../../utils/format';
import { Avatar, CategoryIcon, StatusBadge } from '../ui';

interface AppointmentCardProps {
  appointment: Appointment;
  /** Whose details to show as the counterpart. */
  perspective: 'customer' | 'provider' | 'admin';
  actions?: ReactNode;
}

export function AppointmentCard({ appointment: a, perspective, actions }: AppointmentCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const counterpart = perspective === 'provider' ? a.customer : a.provider;
  const subtitle =
    perspective === 'provider'
      ? a.customer.email
      : perspective === 'admin'
        ? `Customer: ${a.customer.name}`
        : a.providerProfile?.specialization;

  return (
    <article className="card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Avatar name={counterpart.name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-slate-900">{perspective === 'admin' ? `${a.provider.name}` : counterpart.name}</h3>
              <StatusBadge status={a.status} />
            </div>
            <p className="truncate text-sm text-slate-500">{subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {formatDate(a.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {formatTime(a.startTime)} – {formatTime(a.endTime)}
              </span>
              {a.providerProfile?.category && (
                <span className="inline-flex items-center gap-1.5">
                  <CategoryIcon icon={a.providerProfile.category.icon} className="h-4 w-4 text-slate-400" />
                  {a.providerProfile.category.name}
                </span>
              )}
              {perspective !== 'provider' && a.providerProfile?.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {a.providerProfile.city}
                </span>
              )}
            </div>
            {a.notes && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {a.notes}
              </p>
            )}
            {a.cancellationReason && a.status === 'cancelled' && <p className="mt-2 text-sm text-slate-500">Reason: {a.cancellationReason}</p>}
            {a.rating && (
              <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < a.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                ))}
                {a.review && <span className="ml-1 italic">“{a.review}”</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <span className="text-sm font-semibold text-slate-800">{formatMoney(a.price, a.providerProfile?.currency)}</span>
          {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      </div>
      {a.statusHistory?.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button onClick={() => setShowHistory((s) => !s)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800" aria-expanded={showHistory}>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            History ({a.statusHistory.length})
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3 text-xs text-slate-500">
              {a.statusHistory.map((h, i) => (
                <li key={i}>
                  <span className="font-medium text-slate-700">{STATUS_LABEL[h.status]}</span> · {formatDateTime(h.at)}
                  {h.note && <span> — {h.note}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}
