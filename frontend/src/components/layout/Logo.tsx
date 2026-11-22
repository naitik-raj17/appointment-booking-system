import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <CalendarCheck className="h-5 w-5" />
      </span>
      <span className="text-lg tracking-tight">BookEase</span>
    </Link>
  );
}
