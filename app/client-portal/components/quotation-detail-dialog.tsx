'use client';

import { useTranslation } from 'react-i18next';

import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
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
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogCloseButton } from '@/components/dialog-close-button';
import { Badge } from '@/components/ui/badge';
import { QuotationConversionActions } from '@/components/quotation-conversion-actions';
import { getBranchDisplayLabel } from '@/api/types/branch';

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
  const { t } = useTranslation('portal');
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
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0 text-left">
          <DialogTitle className="pr-2">{title}</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge className={quotationStatusClass(quotation.status)}>
              {formatQuotationStatusLabel(quotation.status)}
            </Badge>
            {quotation.isClientPlaced && (
              <Badge variant="outline">{t('clientPlaced')}</Badge>
            )}
            {quotation.isConverted && (
              <Badge variant="outline">{t('convertedToOrder')}</Badge>
            )}
            <QuotationConversionActions
              quotationRef={quotation.uid}
              alreadyConverted={quotation.isConverted}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetadataRow label={t('quotationNumber')} value={quotation.quotationNumber} />
            <MetadataRow label={t('orderNumber')} value={quotation.orderNumber} />
            <MetadataRow
              label={t('status')}
              value={formatQuotationStatusLabel(quotation.status)}
            />
            <MetadataRow
              label={t('total')}
              value={formatZar(parseQuotationAmount(quotation.totalAmount))}
            />
            <MetadataRow
              label={t('items')}
              value={
                quotation.totalItems != null
                  ? String(quotation.totalItems)
                  : items.length > 0
                    ? String(items.length)
                    : null
              }
            />
            <MetadataRow label={t('currency')} value={quotation.currency ?? 'ZAR'} />
            <MetadataRow label={t('created')} value={formatDate(quotation.createdAt)} />
            <MetadataRow label={t('updated')} value={formatDate(quotation.updatedAt)} />
            <MetadataRow label={t('validUntil')} value={formatDate(quotation.validUntil)} />
            <MetadataRow
              label={t('client')}
              value={quotation.client?.name ?? client.name}
            />
            <MetadataRow label={t('placedBy')} value={placedByName} />
            <MetadataRow
              label={t('converted')}
              value={
                quotation.isConverted
                  ? formatDate(quotation.convertedAt as string) ?? 'Yes'
                  : null
              }
            />
            <MetadataRow label={t('title')} value={quotation.title} />
            <MetadataRow label={t('description')} value={quotation.description} />
            <MetadataRow label={t('shippingMethod')} value={quotation.shippingMethod} />
            <MetadataRow
              label={t('shippingInstructions')}
              value={quotation.shippingInstructions}
            />
            <MetadataRow
              label={t('packaging')}
              value={quotation.packagingRequirements}
            />
            <MetadataRow label={t('promoCode')} value={quotation.promoCode} />
            <MetadataRow label={t('priceList')} value={quotation.priceListType} />
            <MetadataRow label={t('branch')} value={getBranchDisplayLabel(quotation.branch) || undefined} />
            <MetadataRow label={t('organisation')} value={quotation.organisation?.name} />
            <MetadataRow label={t('notes')} value={quotation.notes} />
            {quotation.pdfURL && (
              <MetadataRow
                label={t('pdf')}
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
              <p className="font-medium mb-2">{t('lineItems')}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <QuotationLineItemRow key={item.id} {...item} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('noLineItems')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
