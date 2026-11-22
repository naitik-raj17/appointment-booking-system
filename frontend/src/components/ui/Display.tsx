import type { ReactNode } from 'react';
import { Star } from 'lucide-react';
import type { AppointmentStatus } from '../../types';
import { STATUS_LABEL, initials } from '../../utils/format';

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  completed: 'bg-brand-50 text-brand-700 ring-brand-600/20',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function Badge({ children, className = 'bg-slate-100 text-slate-700 ring-slate-500/20' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>{children}</span>;
}

const AVATAR_COLORS = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700'];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const hash = [...name].reduce((h, c) => h + c.charCodeAt(0), 0);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} ${sizes[size]}`} aria-hidden>
      {initials(name)}
    </div>
  );
}

export function Rating({ value, count, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'md' }) {
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  if (!count) return <span className="text-xs text-slate-500">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className={`${icon} fill-amber-400 text-amber-400`} />
      <span className="font-semibold text-slate-800">{value.toFixed(1)}</span>
      <span className="text-slate-500">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-0.5 hover:scale-110">
          <Star className={`h-7 w-7 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, icon, hint, tone = 'brand' }: { label: string; value: ReactNode; icon: ReactNode; hint?: string; tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', sky: 'bg-sky-50 text-sky-600' };
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-full gap-1 border-b border-slate-200 sm:min-w-0">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              value === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
