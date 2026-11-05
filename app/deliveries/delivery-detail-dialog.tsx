'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  LEAD_DETAIL_DIALOG_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { DeliveryDetailContent } from '@/app/deliveries/delivery-detail-content';

export interface DeliveryDetailDialogProps {
  uid: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full delivery record, opened from a list row without leaving the page. */
export function DeliveryDetailDialog({ uid, open, onOpenChange }: DeliveryDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={LEAD_DETAIL_DIALOG_CONTENT_CLASS}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle>Delivery</DialogTitle>
          <DialogDescription className="sr-only">Delivery details</DialogDescription>
        </DialogHeader>
        {uid != null ? <DeliveryDetailContent uid={uid} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
