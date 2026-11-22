import { useEffect, useState } from 'react';
import { appointmentApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import type { Appointment } from '../../types';
import { Alert, Button, Modal, StarInput, Textarea } from '../ui';

export function ReviewModal({ appointment, onClose, onDone }: { appointment: Appointment | null; onClose: () => void; onDone: (a: Appointment) => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(5);
    setReview('');
    setError(null);
  }, [appointment]);

  const submit = async () => {
    if (!appointment) return;
    setSaving(true);
    try {
      const updated = await appointmentApi.review(appointment._id, rating, review.trim());
      toast.success('Thanks for your feedback!');
      onDone(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={onClose}
      size="sm"
      title="Rate your appointment"
      description={appointment ? `How was your visit with ${appointment.provider.name}?` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Later
          </Button>
          <Button onClick={submit} loading={saving}>
            Submit rating
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <StarInput value={rating} onChange={setRating} />
        <Textarea label="Review (optional)" maxLength={500} value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share what went well…" />
        {error && <Alert kind="error">{error}</Alert>}
      </div>
    </Modal>
  );
}
