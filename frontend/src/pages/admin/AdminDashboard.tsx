import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, DollarSign, UserCheck, Users } from 'lucide-react';
import { adminApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Alert, ErrorState, PageHeader, PageLoader, StatCard } from '../../components/ui';
import { formatDate, formatMoney, STATUS_LABEL, timeAgo } from '../../utils/format';
import type { AppointmentStatus } from '../../types';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-emerald-500',
  completed: 'bg-brand-500',
  cancelled: 'bg-slate-400',
  rejected: 'bg-red-400',
};

export default function AdminDashboard() {
  const stats = useAsync(() => adminApi.stats(), []);
  const activity = useAsync(() => adminApi.activity(1, 8), []);

  if (stats.loading) return <PageLoader label="Loading analytics…" />;
  if (stats.error || !stats.data) return <ErrorState message={stats.error || 'No data'} onRetry={stats.reload} />;
  const s = stats.data;
  const maxDaily = Math.max(1, ...s.bookingsLast14Days.map((d) => d.count));
  const maxCategory = Math.max(1, ...s.bookingsByCategory.map((c) => c.count));
  const statuses = Object.entries(s.appointments.byStatus) as [AppointmentStatus, number][];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Platform health at a glance." />
      {s.pendingProviders > 0 && (
        <div className="mb-6">
          <Alert kind="warning">
            {s.pendingProviders} provider{s.pendingProviders > 1 ? 's are' : ' is'} awaiting approval.{' '}
            <Link to="/admin/manage?tab=providers" className="font-medium underline">
              Review now
            </Link>
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Users" value={s.users.total} hint={`${s.users.customers} customers · ${s.users.providers} providers`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Appointments" value={s.appointments.total} hint={`${s.appointments.today} today`} icon={<CalendarDays className="h-5 w-5" />} tone="sky" />
        <StatCard label="Pending approvals" value={s.pendingProviders} icon={<UserCheck className="h-5 w-5" />} tone="amber" />
        <StatCard label="Completed revenue" value={formatMoney(s.revenue)} icon={<DollarSign className="h-5 w-5" />} tone="emerald" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <h2 className="font-semibold">Bookings created · last 14 days</h2>
          <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2" role="img" aria-label="Bar chart of bookings per day">
            {s.bookingsLast14Days.map((d) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-slate-500 opacity-0 group-hover:opacity-100">{d.count}</span>
                <div className="w-full rounded-t-md bg-brand-500/85 transition-colors group-hover:bg-brand-600" style={{ height: `${(d.count / maxDaily) * 150 + 2}px` }} title={`${formatDate(d.date)}: ${d.count}`} />
                <span className="text-[10px] text-slate-400">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Appointments by status</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {statuses.map(([status, count]) => (
              <div key={status} className={STATUS_COLORS[status]} style={{ width: `${(count / Math.max(1, s.appointments.total)) * 100}%` }} title={`${STATUS_LABEL[status]}: ${count}`} />
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {statuses.map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} /> {STATUS_LABEL[status]}
                </span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-5">
          <h2 className="font-semibold">Bookings by category</h2>
          <ul className="mt-4 space-y-3">
            {s.bookingsByCategory.map((c) => (
              <li key={c.category}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{c.category}</span>
                  <span className="font-medium">{c.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-hidden xl:col-span-2">
          <div className="px-5 pt-5">
            <h2 className="font-semibold">Top providers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 font-medium">Bookings</th>
                  <th className="px-3 py-2 font-medium">Rating</th>
                  <th className="px-5 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.topProviders.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2.5">
                      <Link to={`/providers/${p.id}`} className="font-medium hover:text-brand-600">
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-500">{p.specialization}</p>
                    </td>
                    <td className="px-3 py-2.5">{p.bookings}</td>
                    <td className="px-3 py-2.5">{p.rating ? p.rating.toFixed(1) : '—'}</td>
                    <td className="px-5 py-2.5 text-right">{formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent activity</h2>
          <Link to="/admin/manage?tab=activity" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            Full log <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {activity.data?.data.map((a) => (
            <li key={a._id} className="flex items-start justify-between gap-4 py-2.5">
              <span className="text-slate-700">{a.description || a.action}</span>
              <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
