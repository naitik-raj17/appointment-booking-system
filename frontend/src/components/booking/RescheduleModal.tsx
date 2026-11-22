import { useEffect, useState } from 'react';
import { providerApi, appointmentApi } from '../../api';
import { ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type { Appointment, Availability } from '../../types';
import { formatDate, formatTime } from '../../utils/format';
import { Alert, Button, Modal, Spinner } from '../ui';
import { Calendar } from './Calendar';
import { SlotPicker } from './SlotPicker';
import { bookingRange, makeDateFilter } from './availabilityRules';

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onDone: (updated: Appointment) => void;
}

export function RescheduleModal({ appointment, onClose, onDone }: Props) {
  const toast = useToast();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const range = bookingRange();

  useEffect(() => {
    if (!appointment) return;
    setDate(appointment.date >= range.min ? appointment.date : null);
    setTime(null);
    setError(null);
    setLoading(true);
    providerApi
      .get(appointment.provider._id)
      .then((p) => setAvailability(p.availability))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment]);

  const submit = async () => {
    if (!appointment || !date || !time) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await appointmentApi.reschedule(appointment._id, date, time);
      toast.success('Reschedule requested. The provider will confirm the new time.');
      onDone(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reschedule');
      if (err instanceof ApiError && err.status === 409) {
        setTime(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={onClose}
      size="lg"
      title="Reschedule appointment"
      description={appointment ? `Currently ${formatDate(appointment.date)} at ${formatTime(appointment.startTime)} with ${appointment.provider.name}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!date || !time}>
            Request new time
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Calendar
            value={date}
            onChange={(d) => {
              setDate(d);
              setTime(null);
            }}
            minDate={range.min}
            maxDate={range.max}
            isDisabled={makeDateFilter(availability)}
          />
          <div>
            {date && appointment ? (
              <SlotPicker providerId={appointment.provider._id} date={date} value={time} onChange={setTime} refreshKey={refreshKey} />
            ) : (
              <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">Pick a date to see available times.</p>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
