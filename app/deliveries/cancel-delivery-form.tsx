'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCancelDeliveryMutation } from '@/api/hooks';
import {
  cancellationReasonNeedsNote,
  cancellationReasonsForSide,
  DELIVERY_CANCELLATION_SIDES,
  type DeliveryCancellationReason,
  type DeliveryCancellationSide,
} from '@/api/types/epod';
import {
  DETAIL_DIALOG_SMALL_CONTENT_CLASS,
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { formatCancellationReason, formatCancellationSide } from '@/app/deliveries/format';

export interface CancelDeliveryTarget {
  uid: number;
  deliveryNumber: string;
  invoiceNumber?: string | null;
}

export interface CancelDeliveryDialogProps {
  target: CancelDeliveryTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

/** Focused modal to cancel a single delivery stop using app-standard Select dropdowns. */
export function CancelDeliveryDialog({
  target,
  open,
  onOpenChange,
  onCancelled,
}: CancelDeliveryDialogProps) {
  const cancel = useCancelDeliveryMutation(target?.uid ?? 0);
  const [side, setSide] = useState<DeliveryCancellationSide | ''>('');
  const [reason, setReason] = useState<DeliveryCancellationReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSide('');
      setReason('');
      setNote('');
      setError(null);
      cancel.reset();
    }
  }, [open, target?.uid]);

  const reasons = side ? cancellationReasonsForSide(side) : [];
  const needsNote = reason ? cancellationReasonNeedsNote(reason) : false;

  async function handleSubmit() {
    if (!target) return;
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
    await cancel.mutateAsync({
      side,
      reason,
      ...(trimmed ? { note: trimmed } : {}),
    });
    onOpenChange(false);
    onCancelled?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={DETAIL_DIALOG_SMALL_CONTENT_CLASS}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
            Cancel {target?.deliveryNumber ?? 'delivery'}
          </DialogTitle>
          <DialogDescription>
            {target?.invoiceNumber
              ? `Invoice ${target.invoiceNumber}. Choose who caused the cancellation and why. This locks the stop and frees the order for reassignment.`
              : 'Choose who caused the cancellation and why. This locks the stop and frees the order for reassignment.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-side">Cancelled by</Label>
            <Select
              value={side}
              onValueChange={(value) => {
                setSide(value as DeliveryCancellationSide);
                setReason('');
                setNote('');
                setError(null);
              }}
            >
              <SelectTrigger id="cancel-side" className="w-full" aria-label="Cancelled by">
                <SelectValue placeholder="Select who caused the cancellation" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_CANCELLATION_SIDES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatCancellationSide(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {side ? (
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Reason</Label>
              <Select
                value={reason}
                onValueChange={(value) => {
                  setReason(value as DeliveryCancellationReason);
                  setError(null);
                }}
              >
                <SelectTrigger id="cancel-reason" className="w-full" aria-label="Cancellation reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatCancellationReason(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {reason ? (
            <div className="space-y-1.5">
              <Label htmlFor="cancel-note">
                {needsNote ? 'Type the reason' : 'Extra detail (optional)'}
              </Label>
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
          {cancel.isError ? (
            <p className="text-destructive text-sm">{getQueryErrorMessage(cancel.error)}</p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => onOpenChange(false)}
          >
            Keep delivery
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
            disabled={cancel.isPending}
            onClick={() => void handleSubmit()}
            aria-label="Confirm cancel delivery"
          >
            {cancel.isPending ? 'Cancelling…' : 'Confirm cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
