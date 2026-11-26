'use client';

import { FileText } from 'lucide-react';
import { useDelivery } from '@/api/hooks';
import {
  DETAIL_DIALOG_CONTENT_CLASS,
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  deliveryStatusClassName,
  formatDeliveryStatus,
  formatWeightKg,
} from '@/app/deliveries/format';
import { useTranslation } from 'react-i18next';

export interface InvoiceItemsDialogProps {
  deliveryUid: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Displays all line items for a single invoice/stop selected from a delivery's Invoices card. */
export function InvoiceItemsDialog({
  deliveryUid,
  open,
  onOpenChange,
}: InvoiceItemsDialogProps) {
  const { t } = useTranslation('screens');
  const query = useDelivery(deliveryUid ?? 0, open && deliveryUid != null);
  const delivery = query.data;
  const invoiceTitle =
    delivery?.invoiceNumber || delivery?.orderNumber || delivery?.deliveryNumber || 'Invoice items';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={DETAIL_DIALOG_CONTENT_CLASS}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <FileText className="size-4 text-violet-500" aria-hidden />
            <span>{invoiceTitle}</span>
            {delivery ? (
              <Badge variant="outline" className={deliveryStatusClassName(delivery.status)}>
                {formatDeliveryStatus(delivery.status)}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {delivery
              ? [
                  delivery.deliveryNumber,
                  delivery.clientName || 'No client',
                  delivery.stopSequence != null ? `Stop ${delivery.stopSequence}` : null,
                  delivery.totalWeightKg != null && delivery.totalWeightKg > 0
                    ? formatWeightKg(delivery.totalWeightKg)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Invoice line items'}
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="py-6">
            <LoadingSpinner />
          </div>
        ) : query.isError || !delivery ? (
          <p className="text-destructive text-sm">{getQueryErrorMessage(query.error)}</p>
        ) : delivery.items.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">This invoice has no line items.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tables.item')}</TableHead>
                  <TableHead className="text-right">{t('tables.ordered')}</TableHead>
                  <TableHead className="text-right">{t('tables.delivered')}</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivery.items.map((item) => (
                  <TableRow key={item.uid}>
                    <TableCell>
                      <span className="font-medium">{item.name}</span>
                      {item.itemCode ? (
                        <span className="text-muted-foreground block text-xs">{item.itemCode}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{item.orderedQty}</TableCell>
                    <TableCell className="text-right">
                      {item.deliveredQty}
                      {item.deliveredQty < item.orderedQty ? (
                        <span className="text-destructive ml-2 text-xs">Short</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {formatWeightKg(item.lineWeightKg)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
