'use client';

import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Loader2, Mail, MessageSquare, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useEngageCampaignDraftMutation,
  useSendBulkLeadEngageMutation,
} from '@/api/hooks';
import type { BulkEngageFilters, BulkEngageResponse } from '@/api/types/leads';
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
import { Textarea } from '@/components/ui/textarea';
import { EngageDraftControls } from '@/app/leads/components/engage-draft-controls';
import {
  ENGAGE_WHATSAPP_MAX_CHARS,
  whatsAppOverCap,
  type EngageIntent,
  type EngageTone,
} from '@/lib/engage-draft';

const BULK_ENGAGE_MAX = 100;

type EngageChannel = 'email' | 'sms' | 'whatsapp';

type EngageLeadsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Leads matching the current list filters, including those missing a contact. */
  matchCount: number;
  filters: BulkEngageFilters;
};

function channelLabel(channel: EngageChannel, translate: TFunction): string {
  switch (channel) {
    case 'email':
      return translate('leads.email');
    case 'sms':
      return translate('leads.sms');
    case 'whatsapp':
      return translate('leads.whatsapp');
    default: {
      const unreachable: never = channel;
      return unreachable;
    }
  }
}

function skippedContactLabel(channel: EngageChannel, translate: TFunction): string {
  switch (channel) {
    case 'email':
      return translate('leads.missingEmail');
    case 'sms':
      return translate('leads.missingPhone');
    case 'whatsapp':
      return translate('leads.missingWhatsApp');
    default: {
      const unreachable: never = channel;
      return unreachable;
    }
  }
}

function resultToast(
  data: BulkEngageResponse,
  translate: TFunction<'screens'>,
): string {
  if (data.matched === 0) return data.message || translate('leads.noLeadsMatch');
  return translate('leads.engageResult', { sent: data.sent, skipped: data.skipped, failed: data.failed });
}

/**
 * Admin dialog to write or AI-draft one message and send it to leads matching the current filters.
 */
export function EngageLeadsDialog({
  open,
  onOpenChange,
  matchCount,
  filters,
}: EngageLeadsDialogProps) {
  const { t } = useTranslation('screens');
  const [channel, setChannel] = useState<EngageChannel | null>(null);
  const [intent, setIntent] = useState<EngageIntent>('first_contact');
  const [tone, setTone] = useState<EngageTone>('professional');
  const [industry, setIndustry] = useState('');
  const [need, setNeed] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const draftMutation = useEngageCampaignDraftMutation();
  const sendMutation = useSendBulkLeadEngageMutation();

  useEffect(() => {
    if (open) return;
    setChannel(null);
    setIntent('first_contact');
    setTone('professional');
    setIndustry('');
    setNeed('');
    setMessage('');
    setConfirming(false);
  }, [open]);

  const overCap = matchCount > BULK_ENGAGE_MAX;
  const messageTooLong = whatsAppOverCap(channel, message);
  const canSend = Boolean(channel && message.trim() && matchCount > 0 && !overCap && !messageTooLong);

  function handleWriteWithAi() {
    if (!channel) return;
    draftMutation.mutate(
      {
        channel,
        intent,
        tone,
        ...(industry ? { industry } : {}),
        need,
      },
      {
        onSuccess: (data) => {
          setMessage(data.draft ?? '');
        },
      }
    );
  }

  function handleSend() {
    if (!channel || !message.trim()) return;
    sendMutation.mutate(
      { ...filters, channel, message: message.trim() },
      {
        onSuccess: (data) => {
          toast.success(resultToast(data, t));
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('leads.engageLeads')}</DialogTitle>
          <DialogDescription>
            {channel
              ? (matchCount === 1
                ? t('leads.matchSkippedOne', { count: matchCount, contact: skippedContactLabel(channel, t) })
                : t('leads.matchSkipped', { count: matchCount, contact: skippedContactLabel(channel, t) }))
              : (matchCount === 1
                ? t('leads.matchFiltersOne', { count: matchCount })
                : t('leads.matchFilters', { count: matchCount }))}
            {overCap
              ? t('leads.narrowFilters', { max: BULK_ENGAGE_MAX })
              : t('leads.atMost', { max: BULK_ENGAGE_MAX })}
          </DialogDescription>
        </DialogHeader>

        {confirming && channel ? (
          <div className="space-y-3 text-sm">
            <p>
              {t('leads.confirmSend', { channel: channelLabel(channel, t), count: matchCount })}
            </p>
            <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-muted-foreground">
              {message.trim()}
            </p>
            {channel === 'whatsapp' ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.whatsAppCount', { count: message.trim().length, max: ENGAGE_WHATSAPP_MAX_CHARS })}
                {messageTooLong ? t('leads.shortenBeforeSend') : ''}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`gap-1.5 ${channel === 'email' ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                onClick={() => setChannel('email')}
              >
                <Mail className="size-4" />
                {t('leads.email')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`gap-1.5 ${channel === 'sms' ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700' : ''}`}
                onClick={() => setChannel('sms')}
              >
                <MessageSquare className="size-4" />
                {t('leads.sms')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`gap-1.5 ${channel === 'whatsapp' ? 'border-green-600 bg-green-600 text-white hover:bg-green-700' : ''}`}
                onClick={() => setChannel('whatsapp')}
              >
                <MessageSquare className="size-4" />
                {t('leads.whatsapp')}
              </Button>
            </div>

            <EngageDraftControls
              intent={intent}
              tone={tone}
              industry={industry}
              need={need}
              allowMixedIndustry
              onIntentChange={setIntent}
              onToneChange={setTone}
              onIndustryChange={setIndustry}
              onNeedChange={setNeed}
            />

            <div className="space-y-1">
              <Label className="text-xs">{t('leads.message')}</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                className="resize-y text-sm"
                placeholder={t('leads.messagePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('leads.nameTokenHint', { token: '{{name}}' })}
                {channel === 'sms' && message.length > 160
                  ? t('leads.smsSplit')
                  : ''}
                {channel === 'whatsapp'
                  ? t('leads.whatsAppCount', { count: message.trim().length, max: ENGAGE_WHATSAPP_MAX_CHARS })
                  : ''}
                {messageTooLong ? t('leads.shortenWhatsApp') : ''}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {confirming ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={sendMutation.isPending}
              >
                {t('actions.back')}
              </Button>
              <Button
                type="button"
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={handleSend}
                disabled={!canSend || sendMutation.isPending}
              >
                {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t('actions.send')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={handleWriteWithAi}
                disabled={!channel || draftMutation.isPending}
              >
                {draftMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {t('leads.writeWithAi')}
              </Button>
              <Button
                type="button"
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => setConfirming(true)}
                disabled={!canSend || draftMutation.isPending}
              >
                Review send
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
