import { useState } from 'react';
import { Check, CheckCheck, Search, XCircle } from 'lucide-react';
import { adminApi, appointmentApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import type { Appointment, AppointmentStatus } from '../../types';
import { hoursUntil, STATUS_LABEL } from '../../utils/format';
import { Button, ConfirmDialog, EmptyState, ErrorState, Input, Pagination, Select, Skeleton } from '../../components/ui';
import { AppointmentCard } from '../../components/booking/AppointmentCard';

export function AppointmentsPanel() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const debouncedQ = useDebounce(q);

  const { data, loading, error, reload } = useAsync(
    () => adminApi.appointments({ status: status || undefined, q: debouncedQ || undefined, from: from || undefined, to: to || undefined, page, limit: 8 }),
    [status, debouncedQ, from, to, page]
  );

  const setStatusFor = async (a: Appointment, next: 'confirmed' | 'completed') => {
    setBusy(a._id);
    try {
      await appointmentApi.setStatus(a._id, next);
      toast.success(`Appointment ${STATUS_LABEL[next].toLowerCase()}`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const actionsFor = (a: Appointment) => {
    const started = hoursUntil(a.date, a.startTime) <= 0;
    return (
      <>
        {a.status === 'pending' && !started && (
          <Button size="sm" variant="success" loading={busy === a._id} onClick={() => setStatusFor(a, 'confirmed')}>
            <Check className="h-3.5 w-3.5" /> Confirm
          </Button>
        )}
        {a.status === 'confirmed' && started && (
          <Button size="sm" variant="secondary" loading={busy === a._id} onClick={() => setStatusFor(a, 'completed')}>
            <CheckCheck className="h-3.5 w-3.5" /> Complete
          </Button>
        )}
        {a.isActive && (
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setCancelTarget(a)}>
            <XCircle className="h-3.5 w-3.5" /> Cancel
          </Button>
        )}
      </>
    );
  };

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Customer or provider name" value={q} onChange={(e) => resetPage(setQ)(e.target.value)} aria-label="Search appointments" />
        </div>
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} aria-label="To date" />
      </div>
      <div className="space-y-3">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
        ) : data && data.data.length > 0 ? (
          <>
            {data.data.map((a) => (
              <AppointmentCard key={a._id} appointment={a} perspective="admin" actions={actionsFor(a)} />
            ))}
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
          </>
        ) : (
          <EmptyState title="No appointments match these filters" />
        )}
      </div>
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel appointment as administrator?"
        message={cancelTarget ? `Both ${cancelTarget.customer.name} and ${cancelTarget.provider.name} will be notified.` : ''}
        confirmLabel="Cancel appointment"
        variant="danger"
        withReason
        onClose={() => setCancelTarget(null)}
        onConfirm={async (reason) => {
          try {
            await appointmentApi.setStatus(cancelTarget!._id, 'cancelled', reason);
            toast.success('Appointment cancelled');
            reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not cancel');
            throw err;
          }
        }}
      />
    </div>
  );
}
