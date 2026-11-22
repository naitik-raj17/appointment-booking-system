import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, CalendarClock, CheckCircle2, Hourglass, Search } from 'lucide-react';
import { appointmentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from '../../components/ui';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { useCustomerActions } from './useCustomerActions';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => appointmentApi.summary(), []);
  const { actionsFor, dialogs } = useCustomerActions(() => reload());

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.name.split(' ')[0]} 👋`}
        subtitle="Here's what's coming up for you."
        actions={
          <Link to="/providers">
            <Button>
              <Search className="h-4 w-4" /> Book an appointment
            </Button>
          </Link>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {loading || !data ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px]" />)
            ) : (
              <>
                <StatCard label="Upcoming" value={data.upcoming.length} icon={<CalendarClock className="h-5 w-5" />} hint="next 5 shown" />
                <StatCard label="Confirmed" value={data.byStatus.confirmed} icon={<CalendarCheck2 className="h-5 w-5" />} tone="emerald" />
                <StatCard label="Awaiting reply" value={data.byStatus.pending} icon={<Hourglass className="h-5 w-5" />} tone="amber" />
                <StatCard label="Completed" value={data.byStatus.completed} icon={<CheckCircle2 className="h-5 w-5" />} tone="sky" />
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming appointments</h2>
            <Link to="/customer/appointments" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {loading ? (
              Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-28" />)
            ) : data && data.upcoming.length > 0 ? (
              data.upcoming.map((a) => <AppointmentCard key={a._id} appointment={a} perspective="customer" actions={actionsFor(a)} />)
            ) : (
              <EmptyState
                title="No upcoming appointments"
                message="Find a provider and book your next visit."
                action={
                  <Link to="/providers">
                    <Button variant="outline">Browse providers</Button>
                  </Link>
                }
              />
            )}
          </div>
        </>
      )}
      {dialogs}
    </div>
  );
}
