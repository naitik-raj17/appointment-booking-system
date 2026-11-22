import { useState } from 'react';
import { Check, CheckCheck, X, XCircle } from 'lucide-react';
import { appointmentApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import type { Appointment } from '../../types';
import { hoursUntil } from '../../utils/format';
import { Button, ConfirmDialog } from '../../components/ui';

type Action = { appt: Appointment; kind: 'rejected' | 'cancelled' };

/** Accept / decline / cancel / complete actions used on provider appointment lists. */
export function useProviderActions(onChanged: (a: Appointment) => void) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Action | null>(null);

  const quick = async (a: Appointment, status: 'confirmed' | 'completed') => {
    setBusyId(a._id);
    try {
      const updated = await appointmentApi.setStatus(a._id, status);
      toast.success(status === 'confirmed' ? `Confirmed ${a.customer.name}'s appointment` : 'Marked as completed');
      onChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const actionsFor = (a: Appointment) => {
    const started = hoursUntil(a.date, a.startTime) <= 0;
    const busy = busyId === a._id;
    if (a.status === 'pending') {
      return (
        <>
          {!started && (
            <Button size="sm" variant="success" loading={busy} onClick={() => quick(a, 'confirmed')}>
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setDialog({ appt: a, kind: 'rejected' })}>
            <X className="h-3.5 w-3.5" /> Decline
          </Button>
        </>
      );
    }
    if (a.status === 'confirmed') {
      return started ? (
        <>
          <Button size="sm" variant="secondary" loading={busy} onClick={() => quick(a, 'completed')}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark completed
          </Button>
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setDialog({ appt: a, kind: 'cancelled' })}>
            No-show
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDialog({ appt: a, kind: 'cancelled' })}>
          <XCircle className="h-3.5 w-3.5" /> Cancel
        </Button>
      );
    }
    return null;
  };

  const dialogs = (
    <ConfirmDialog
      open={Boolean(dialog)}
      title={dialog?.kind === 'rejected' ? 'Decline booking request?' : 'Cancel appointment?'}
      message={dialog ? `${dialog.appt.customer.name} will be notified by email${dialog.kind === 'cancelled' ? ' and the slot will be released' : ''}.` : ''}
      confirmLabel={dialog?.kind === 'rejected' ? 'Decline' : 'Cancel appointment'}
      variant="danger"
      withReason
      onClose={() => setDialog(null)}
      onConfirm={async (reason) => {
        try {
          const updated = await appointmentApi.setStatus(dialog!.appt._id, dialog!.kind, reason);
          toast.success(dialog!.kind === 'rejected' ? 'Request declined' : 'Appointment cancelled');
          onChanged(updated);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Action failed');
          throw err;
        }
      }}
    />
  );

  return { actionsFor, dialogs };
}
