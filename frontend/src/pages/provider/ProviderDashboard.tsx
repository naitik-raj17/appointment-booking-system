import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, CalendarClock, CheckCircle2, Hourglass, Star } from 'lucide-react';
import { appointmentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { Alert, Avatar, Button, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge } from '../../components/ui';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { formatTime } from '../../utils/format';
import { useProviderActions } from './useProviderActions';

export default function ProviderDashboard() {
  const { user, providerProfile, refresh } = useAuth();
  const summary = useAsync(() => appointmentApi.summary(), []);
  const requests = useAsync(() => appointmentApi.list({ status: 'pending', scope: 'upcoming', sort: 'asc', limit: 5 }), []);
  const reloadAll = () => {
    summary.reload();
    requests.reload();
  };
  const { actionsFor, dialogs } = useProviderActions(reloadAll);
  const s = summary.data;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        subtitle={providerProfile ? `${providerProfile.specialization} · ${providerProfile.category?.name}` : undefined}
        actions={
          <>
            <Link to="/provider/availability">
              <Button variant="outline">
                <CalendarClock className="h-4 w-4" /> Working hours
              </Button>
            </Link>
            {providerProfile?.isApproved && (
              <Link to={`/providers/${user?._id}`}>
                <Button variant="secondary">View public profile</Button>
              </Link>
            )}
          </>
        }
      />

      {providerProfile && !providerProfile.isApproved && (
        <div className="mb-6">
          <Alert kind="warning">
            Your profile is awaiting administrator approval and is not yet visible in search. Meanwhile, set up your{' '}
            <Link to="/provider/availability" className="font-medium underline">
              working hours
            </Link>{' '}
            and{' '}
            <Link to="/provider/profile" className="font-medium underline">
              public profile
            </Link>
            .{' '}
            <button className="font-medium underline" onClick={() => refresh()}>
              Check status
            </button>
          </Alert>
        </div>
      )}

      {summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {!s ? (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px]" />)
          ) : (
            <>
              <StatCard label="Pending requests" value={s.byStatus.pending} icon={<Hourglass className="h-5 w-5" />} tone="amber" />
              <StatCard label="Confirmed" value={s.byStatus.confirmed} icon={<CalendarCheck2 className="h-5 w-5" />} tone="emerald" />
              <StatCard label="Completed" value={s.byStatus.completed} icon={<CheckCircle2 className="h-5 w-5" />} tone="sky" />
              <StatCard
                label="Rating"
                value={providerProfile?.ratingCount ? providerProfile.ratingAverage.toFixed(1) : '—'}
                hint={`${providerProfile?.ratingCount ?? 0} reviews`}
                icon={<Star className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-5">
        <section className="xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Booking requests</h2>
            <Link to="/provider/appointments" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              Manage all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {requests.loading ? (
              <Skeleton className="h-28" />
            ) : requests.error ? (
              <ErrorState message={requests.error} onRetry={requests.reload} />
            ) : requests.data && requests.data.data.length > 0 ? (
              requests.data.data.map((a) => <AppointmentCard key={a._id} appointment={a} perspective="provider" actions={actionsFor(a)} />)
            ) : (
              <EmptyState title="No pending requests" message="New booking requests will appear here." />
            )}
          </div>
        </section>

        <section className="xl:col-span-2">
          <h2 className="text-lg font-semibold">Today's schedule</h2>
          <div className="card mt-3 divide-y divide-slate-100">
            {!s ? (
              <div className="p-4">
                <Skeleton className="h-16" />
              </div>
            ) : s.today.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Nothing scheduled for today.</p>
            ) : (
              s.today.map((a) => (
                <div key={a._id} className="flex items-center gap-3 p-4">
                  <div className="w-16 shrink-0 text-sm font-semibold text-slate-800">{formatTime(a.startTime)}</div>
                  <Avatar name={a.customer.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.customer.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.notes || a.customer.email}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      {dialogs}
    </div>
  );
}
