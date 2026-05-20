'use client';

import { format } from 'date-fns';
import type { ClientProfileData, ClientQuotation } from '@/api/types/client-portal';
import { formatZar, parseQuotationAmount } from '@/lib/client-portal-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { quotationStatusClass } from '@/lib/client-portal-utils';

export function QuotationDetailDialog({
  quotation,
  client,
  open,
  onOpenChange,
}: {
  quotation: ClientQuotation | null;
  client: ClientProfileData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!quotation) return null;

  const items = Array.isArray(quotation.quotationItems)
    ? quotation.quotationItems
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quotation.quotationNumber ?? quotation.title ?? `Quotation #${quotation.uid}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge className={quotationStatusClass(quotation.status)}>
              {(quotation.status ?? 'pending').replace(/_/g, ' ')}
            </Badge>
            {quotation.isClientPlaced && (
              <Badge variant="outline">Client placed</Badge>
            )}
          </div>
          <p>
            <span className="text-muted-foreground">Total: </span>
            {formatZar(parseQuotationAmount(quotation.totalAmount))}
          </p>
          {quotation.createdAt && (
            <p>
              <span className="text-muted-foreground">Created: </span>
              {format(new Date(quotation.createdAt), 'PPp')}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Client: </span>
            {client.name}
          </p>
          {items.length > 0 && (
            <div>
              <p className="font-medium mb-2">Line items</p>
              <ul className="space-y-1 border rounded-md p-3">
                {items.map((item, i) => {
                  const row = item as Record<string, unknown>;
                  return (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{String(row.name ?? row.productName ?? `Item ${i + 1}`)}</span>
                      <span className="text-muted-foreground">
                        ×{String(row.quantity ?? 1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
