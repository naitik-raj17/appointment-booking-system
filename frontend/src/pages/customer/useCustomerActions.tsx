import { useState } from 'react';
import { CalendarClock, Star, XCircle } from 'lucide-react';
import { appointmentApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import type { Appointment } from '../../types';
import { hoursUntil } from '../../utils/format';
import { Button, ConfirmDialog } from '../../components/ui';
import { RescheduleModal } from '../../components/booking/RescheduleModal';
import { ReviewModal } from '../../components/booking/ReviewModal';

/** Mirrors the server's CANCELLATION_WINDOW_HOURS default; the API enforces the real value. */
export const CHANGE_WINDOW_HOURS = 2;

/** Shared cancel / reschedule / review behaviour for customer appointment lists. */
export function useCustomerActions(onChanged: (a: Appointment) => void) {
  const toast = useToast();
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);

  const actionsFor = (a: Appointment) => {
    const changeable = a.isActive && hoursUntil(a.date, a.startTime) >= CHANGE_WINDOW_HOURS;
    return (
      <>
        {changeable && (
          <>
            <Button size="sm" variant="outline" onClick={() => setRescheduleTarget(a)}>
              <CalendarClock className="h-3.5 w-3.5" /> Reschedule
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setCancelTarget(a)}>
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          </>
        )}
        {a.isActive && !changeable && <span className="text-xs text-slate-400">Changes closed ({CHANGE_WINDOW_HOURS}h window)</span>}
        {a.status === 'completed' && !a.rating && (
          <Button size="sm" variant="secondary" onClick={() => setReviewTarget(a)}>
            <Star className="h-3.5 w-3.5" /> Rate
          </Button>
        )}
      </>
    );
  };

  const dialogs = (
    <>
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel appointment?"
        message={cancelTarget ? `Your appointment with ${cancelTarget.provider.name} will be cancelled and the slot released.` : ''}
        confirmLabel="Cancel appointment"
        variant="danger"
        withReason
        onClose={() => setCancelTarget(null)}
        onConfirm={async (reason) => {
          try {
            const updated = await appointmentApi.cancel(cancelTarget!._id, reason);
            toast.success('Appointment cancelled');
            onChanged(updated);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not cancel');
            throw err;
          }
        }}
      />
      <RescheduleModal appointment={rescheduleTarget} onClose={() => setRescheduleTarget(null)} onDone={onChanged} />
      <ReviewModal appointment={reviewTarget} onClose={() => setReviewTarget(null)} onDone={onChanged} />
    </>
  );

  return { actionsFor, dialogs };
}
