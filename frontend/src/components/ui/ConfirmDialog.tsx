import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Field';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'primary' | 'danger' | 'success';
  withReason?: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', variant = 'primary', withReason, reasonLabel = 'Reason (optional)', onConfirm, onClose }: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch {
      /* caller shows the error toast; keep the dialog open */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Go back
          </Button>
          <Button variant={variant} onClick={handle} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
      {withReason && (
        <Textarea wrapperClassName="mt-4" label={reasonLabel} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Let the other party know why…" />
      )}
    </Modal>
  );
}
