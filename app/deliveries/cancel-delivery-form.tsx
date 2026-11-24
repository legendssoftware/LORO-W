'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  cancellationReasonNeedsNote,
  cancellationReasonsForSide,
  DELIVERY_CANCELLATION_SIDES,
  type CancelDeliveryBody,
  type DeliveryCancellationReason,
  type DeliveryCancellationSide,
} from '@/api/types/epod';
import { formatCancellationReason, formatCancellationSide } from '@/app/deliveries/format';

interface CancelDeliveryFormProps {
  isPending: boolean;
  onCancel: (body: CancelDeliveryBody) => Promise<void>;
}

/** Dispatcher cancel form: customer/driver side, preset reason, optional typed note. */
export function CancelDeliveryForm({ isPending, onCancel }: CancelDeliveryFormProps) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<DeliveryCancellationSide | ''>('');
  const [reason, setReason] = useState<DeliveryCancellationReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reasons = side ? cancellationReasonsForSide(side) : [];
  const needsNote = reason ? cancellationReasonNeedsNote(reason) : false;

  async function handleSubmit() {
    if (!side) {
      setError('Choose whether this is a customer or driver cancellation.');
      return;
    }
    if (!reason) {
      setError('Choose a cancellation reason.');
      return;
    }
    const trimmed = note.trim();
    if (needsNote && !trimmed) {
      setError('Type the reason when you select Other.');
      return;
    }
    setError(null);
    await onCancel({
      side,
      reason,
      ...(trimmed ? { note: trimmed } : {}),
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => setOpen(true)}
        aria-label="Cancel this delivery"
      >
        Cancel delivery
      </Button>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium">Cancel this delivery</p>
      <p className="text-muted-foreground text-sm">
        Choose who caused the cancellation and why. This locks the stop.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="cancel-side">Cancelled by</Label>
        <select
          id="cancel-side"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          value={side}
          onChange={(event) => {
            setSide(event.target.value as DeliveryCancellationSide | '');
            setReason('');
            setNote('');
            setError(null);
          }}
        >
          <option value="">Select…</option>
          {DELIVERY_CANCELLATION_SIDES.map((value) => (
            <option key={value} value={value}>
              {formatCancellationSide(value)}
            </option>
          ))}
        </select>
      </div>

      {side ? (
        <div className="grid gap-2">
          <Label htmlFor="cancel-reason">Reason</Label>
          <select
            id="cancel-reason"
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as DeliveryCancellationReason | '');
              setError(null);
            }}
          >
            <option value="">Select…</option>
            {reasons.map((value) => (
              <option key={value} value={value}>
                {formatCancellationReason(value)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {reason ? (
        <div className="grid gap-2">
          <Label htmlFor="cancel-note">{needsNote ? 'Type the reason' : 'Extra detail (optional)'}</Label>
          <Textarea
            id="cancel-note"
            value={note}
            maxLength={500}
            rows={3}
            placeholder={
              needsNote
                ? 'Describe why this delivery is being cancelled…'
                : 'Add any extra context…'
            }
            onChange={(event) => {
              setNote(event.target.value);
              setError(null);
            }}
          />
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setSide('');
            setReason('');
            setNote('');
            setError(null);
          }}
        >
          Keep delivery
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() => void handleSubmit()}
          aria-label="Confirm cancel delivery"
        >
          {isPending ? 'Cancelling…' : 'Confirm cancel'}
        </Button>
      </div>
    </div>
  );
}
