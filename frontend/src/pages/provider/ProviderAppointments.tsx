import { useState } from 'react';
import { Search } from 'lucide-react';
import { appointmentApi, type AppointmentQuery } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { EmptyState, ErrorState, Input, PageHeader, Pagination, Skeleton, Tabs } from '../../components/ui';
import { AppointmentCard } from '../../components/booking/AppointmentCard';
import { useProviderActions } from './useProviderActions';

type Tab = 'requests' | 'upcoming' | 'awaiting' | 'history';

const QUERY: Record<Tab, AppointmentQuery> = {
  requests: { status: 'pending', scope: 'upcoming', sort: 'asc' },
  upcoming: { status: 'confirmed', scope: 'upcoming', sort: 'asc' },
  awaiting: { status: 'confirmed,pending', scope: 'past', sort: 'desc' },
  history: { status: 'completed,cancelled,rejected', sort: 'desc' },
};

export default function ProviderAppointments() {
  const [tab, setTab] = useState<Tab>('requests');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const debouncedQ = useDebounce(q);

  const { data, loading, error, reload } = useAsync(
    () => appointmentApi.list({ ...QUERY[tab], q: debouncedQ || undefined, from: date || undefined, to: date || undefined, page, limit: 8 }),
    [tab, page, debouncedQ, date]
  );
  const { actionsFor, dialogs } = useProviderActions(() => reload());

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Review requests, manage your schedule and close out completed sessions." />
      <Tabs
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        tabs={[
          { value: 'requests', label: 'Requests' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'awaiting', label: 'Needs action' },
          { value: 'history', label: 'History' },
        ]}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by customer name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search by customer" />
        </div>
        <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} aria-label="Filter by date" />
      </div>
      {tab === 'awaiting' && <p className="mt-3 text-sm text-slate-500">Past appointments that were never closed. Mark them completed, record a no-show, or decline stale requests.</p>}
      <div className="mt-4 space-y-3">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
        ) : data && data.data.length > 0 ? (
          <>
            {data.data.map((a) => (
              <AppointmentCard key={a._id} appointment={a} perspective="provider" actions={actionsFor(a)} />
            ))}
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
          </>
        ) : (
          <EmptyState title="No appointments" message="Nothing matches this view." />
        )}
      </div>
      {dialogs}
    </div>
  );
}
