import { useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentApi, type AppointmentQuery } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Button, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Tabs } from '../../components/ui';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { useCustomerActions } from './useCustomerActions';

type Tab = 'upcoming' | 'past' | 'cancelled' | 'all';

const QUERY: Record<Tab, AppointmentQuery> = {
  upcoming: { scope: 'upcoming', status: 'pending,confirmed', sort: 'asc' },
  past: { scope: 'past', status: 'completed,confirmed', sort: 'desc' },
  cancelled: { status: 'cancelled,rejected', sort: 'desc' },
  all: { sort: 'desc' },
};

export default function CustomerAppointments() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => appointmentApi.list({ ...QUERY[tab], page, limit: 8 }), [tab, page]);
  const { actionsFor, dialogs } = useCustomerActions(() => reload());

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="My appointments" subtitle="Your booking history, upcoming visits and reviews." />
      <Tabs
        value={tab}
        onChange={changeTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
          { value: 'cancelled', label: 'Cancelled / declined' },
          { value: 'all', label: 'All' },
        ]}
      />
      <div className="mt-4 space-y-3">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
        ) : data && data.data.length > 0 ? (
          <>
            {data.data.map((a) => (
              <AppointmentCard key={a._id} appointment={a} perspective="customer" actions={actionsFor(a)} />
            ))}
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="Nothing here yet"
            message={tab === 'upcoming' ? 'You have no upcoming appointments.' : 'No appointments in this list.'}
            action={
              <Link to="/providers">
                <Button variant="outline">Find a provider</Button>
              </Link>
            }
          />
        )}
      </div>
      {dialogs}
    </div>
  );
}
