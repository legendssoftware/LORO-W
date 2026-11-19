'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import type { LeadListItem } from '@/api/types/leads';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { XIcon, Loader2Icon } from '@/lib/icons';
import { LEAD_STATUS_OPTIONS } from '@/lib/lead-form-utils';

export interface LeadStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadListItem | null;
  newStatus: string;
  onConfirm: (payload: {
    ref: number;
    status: string;
    statusChangeReason?: string;
    statusChangeDescription?: string;
  }) => Promise<void>;
}

function statusLabel(status: string, translate: (key: string) => string): string {
  const match = LEAD_STATUS_OPTIONS.find((o) => o.value === status);
  return match ? translate(match.labelKey) : status ?? '-';
}

export function LeadStatusChangeDialog({
  open,
  onOpenChange,
  lead,
  newStatus,
  onConfirm,
}: LeadStatusChangeDialogProps) {
  const { t } = useTranslation('screens');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setDescription('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!lead) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        ref: lead.uid,
        status: newStatus,
        statusChangeReason: reason.trim() || undefined,
        statusChangeDescription: description.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  const currentStatusLabel = statusLabel(lead.status, t);
  const newStatusLabel = statusLabel(newStatus, t);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-2rem)] sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <DialogClose asChild>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t('leads.closeAria')}
            >
              <XIcon className="size-5" />
            </button>
          </DialogClose>
        </div>
        <DialogHeader className="pr-12">
          <DialogTitle>{t('leads.setStatusTo', { status: newStatusLabel })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <p className="font-medium text-foreground">
              {lead.name?.trim() || t('leads.fallbackName')} · {lead.companyName?.trim() || '-'}
            </p>
            <p className="text-muted-foreground">
              {t('leads.currentStatus', { status: currentStatusLabel })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-status-reason">{t('leads.reasonOptional')}</Label>
            <Input
              id="lead-status-reason"
              placeholder={t('leads.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-status-description">{t('leads.descriptionOptional')}</Label>
            <Textarea
              id="lead-status-description"
              placeholder={t('leads.notesPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="min-h-[120px] resize-y rounded-md"
            />
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="cancel"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >{t('actions.cancel')}</Button>
          <Button
            type="button"
            variant="success"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin mr-2" />{t('actions.confirm')}</>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
