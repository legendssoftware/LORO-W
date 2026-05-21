'use client';

import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { XIcon } from '@/lib/icons';
import type { ClientProfileData, ClientQuotation } from '@/api/types/client-portal';
import {
  formatQuotationStatusLabel,
  formatZar,
  parseQuotationAmount,
  quotationStatusClass,
} from '@/lib/client-portal-utils';
import {
  DEFAULT_PRODUCT_IMAGE_URL,
  parseQuotationLineItems,
} from '@/lib/quotation-line-item';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, 'PPp');
}

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === false) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  );
}

function QuotationLineItemRow({
  name,
  imageSrc,
  quantity,
  unitPrice,
  totalPrice,
  sku,
  purchaseMode,
}: {
  name: string;
  imageSrc: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  purchaseMode?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const src = imageError ? DEFAULT_PRODUCT_IMAGE_URL : imageSrc;

  return (
    <li className="flex gap-3 rounded border p-3">
      <img
        src={src}
        alt={name}
        width={56}
        height={56}
        className="size-14 shrink-0 rounded object-contain bg-muted/30"
        onError={() => setImageError(true)}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm leading-snug">{name}</p>
        {sku && (
          <p className="text-xs text-muted-foreground mt-0.5">SKU: {sku}</p>
        )}
        {purchaseMode && purchaseMode !== 'item' && (
          <p className="text-xs text-muted-foreground capitalize">{purchaseMode}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {quantity} × {formatZar(unitPrice)}
        </p>
      </div>
      <p className="text-sm font-semibold shrink-0">{formatZar(totalPrice)}</p>
    </li>
  );
}

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
    ? parseQuotationLineItems(quotation.quotationItems)
    : [];

  const placedByName = quotation.placedBy
    ? [quotation.placedBy.name, quotation.placedBy.surname].filter(Boolean).join(' ')
    : null;

  const title =
    quotation.quotationNumber ??
    quotation.title ??
    `Quotation #${quotation.uid}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[85vh] overflow-y-auto rounded shadow-none sm:max-w-3xl"
        overlayClassName="bg-background/40 backdrop-blur-[5.6px]"
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0 text-left">
          <DialogTitle className="pr-2">{title}</DialogTitle>
          <DialogClose
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600',
              'transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2'
            )}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge className={quotationStatusClass(quotation.status)}>
              {formatQuotationStatusLabel(quotation.status)}
            </Badge>
            {quotation.isClientPlaced && (
              <Badge variant="outline">Client placed</Badge>
            )}
            {quotation.isConverted && (
              <Badge variant="outline">Converted to order</Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetadataRow label="Quotation #" value={quotation.quotationNumber} />
            <MetadataRow label="Order #" value={quotation.orderNumber} />
            <MetadataRow
              label="Status"
              value={formatQuotationStatusLabel(quotation.status)}
            />
            <MetadataRow
              label="Total"
              value={formatZar(parseQuotationAmount(quotation.totalAmount))}
            />
            <MetadataRow
              label="Items"
              value={
                quotation.totalItems != null
                  ? String(quotation.totalItems)
                  : items.length > 0
                    ? String(items.length)
                    : null
              }
            />
            <MetadataRow label="Currency" value={quotation.currency ?? 'ZAR'} />
            <MetadataRow label="Created" value={formatDate(quotation.createdAt)} />
            <MetadataRow label="Updated" value={formatDate(quotation.updatedAt)} />
            <MetadataRow label="Valid until" value={formatDate(quotation.validUntil)} />
            <MetadataRow
              label="Client"
              value={quotation.client?.name ?? client.name}
            />
            <MetadataRow label="Placed by" value={placedByName} />
            <MetadataRow
              label="Converted"
              value={
                quotation.isConverted
                  ? formatDate(quotation.convertedAt as string) ?? 'Yes'
                  : null
              }
            />
            <MetadataRow label="Title" value={quotation.title} />
            <MetadataRow label="Description" value={quotation.description} />
            <MetadataRow label="Shipping method" value={quotation.shippingMethod} />
            <MetadataRow
              label="Shipping instructions"
              value={quotation.shippingInstructions}
            />
            <MetadataRow
              label="Packaging"
              value={quotation.packagingRequirements}
            />
            <MetadataRow label="Promo code" value={quotation.promoCode} />
            <MetadataRow label="Price list" value={quotation.priceListType} />
            <MetadataRow label="Branch" value={quotation.branch?.name} />
            <MetadataRow label="Organisation" value={quotation.organisation?.name} />
            <MetadataRow label="Notes" value={quotation.notes} />
            {quotation.pdfURL && (
              <MetadataRow
                label="PDF"
                value={
                  <a
                    href={String(quotation.pdfURL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    View quotation PDF
                  </a>
                }
              />
            )}
          </div>

          {items.length > 0 ? (
            <div>
              <p className="font-medium mb-2">Line items</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <QuotationLineItemRow key={item.id} {...item} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No line items on this quotation.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
