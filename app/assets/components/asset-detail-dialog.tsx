'use client';

import type { ReactNode } from 'react';
import type { AssetRecord } from '@/api/types/asset';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { assetCategoryLabel, assetOwnerLabel, assetTitle } from '../lib/asset-display';
import { ASSET_MODAL_CONTENT_CLASS } from './asset-dialog-shared';

function ModalRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium">{value}</span>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString();
}

export function AssetDetailDialog({
  asset,
  open,
  canEdit,
  canDelete,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  asset: AssetRecord | null;
  open: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (asset: AssetRecord) => void;
  onDelete: (asset: AssetRecord) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(ASSET_MODAL_CONTENT_CLASS)}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="truncate text-left">{asset ? assetTitle(asset) : 'Asset'}</DialogTitle>
              {asset ? <Badge variant="secondary">{assetCategoryLabel(asset.category)}</Badge> : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {canEdit && asset ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(asset)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : null}
              {canDelete && asset ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(asset)}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        {asset ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <ModalRow label="Brand" value={asset.brand || '—'} />
            <ModalRow label="Model" value={asset.modelNumber || '—'} />
            <ModalRow label="Serial" value={asset.serialNumber || '—'} />
            <ModalRow label="Owner" value={assetOwnerLabel(asset)} />
            {asset.registrationPlate ? (
              <ModalRow label="Registration" value={asset.registrationPlate} />
            ) : null}
            <Separator />
            <ModalRow label="Purchased" value={formatDate(asset.purchaseDate)} />
            <ModalRow
              label="Insurance"
              value={asset.hasInsurance ? asset.insuranceProvider || 'Yes' : 'No'}
            />
            {asset.hasInsurance ? (
              <ModalRow label="Cover until" value={formatDate(asset.insuranceExpiryDate)} />
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
