'use client';

import { useState } from 'react';
import axios from 'axios';
import type { PulseContactStatus, PulseNamedPerson } from '@/api/types/pulse';
import { useSavePulseContactFeedbackMutation } from '@/api/hooks/use-pulse';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TALK_TO_KEYS } from '../lib/pulse-explain';
import { useTranslation } from 'react-i18next';

const STATUS_OPTIONS: { value: PulseContactStatus; labelKey: string }[] = [
  { value: 'resolved', labelKey: 'chrome.wellbeing.resolved' },
  { value: 'unresolved', labelKey: 'chrome.wellbeing.unresolved' },
];

function saveErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ');
    }
  }
  return fallback;
}

/**
 * Records the outcome after a responsible manager contacts someone in the support queue.
 */
export function WellbeingContactFeedbackForm({
  person,
  date,
}: {
  person: PulseNamedPerson;
  date: string;
}) {
  const { t } = useTranslation('screens');
  const save = useSavePulseContactFeedbackMutation();
  const [status, setStatus] = useState<PulseContactStatus | ''>(person.contactFeedback?.status ?? '');
  const [comment, setComment] = useState(person.contactFeedback?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const askedToTalk = person.talkTo !== 'none';
  const canSave = status !== '' && comment.trim().length > 0 && date.length > 0 && !save.isPending;
  const savedStatus = save.data?.status ?? person.contactFeedback?.status ?? null;
  const talkToKey = TALK_TO_KEYS[person.talkTo];

  async function onSave() {
    if (status === '' || !comment.trim() || !date) return;
    setError(null);
    try {
      await save.mutateAsync({
        ownerUid: person.ownerUid,
        status,
        comment: comment.trim(),
        date,
      });
    } catch (caught) {
      setError(saveErrorMessage(caught, t('chrome.wellbeing.saveFailed')));
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
      <p className="text-xs text-muted-foreground">
        {askedToTalk
          ? t('chrome.wellbeing.askedToSpeak', { who: talkToKey ? t(talkToKey) : person.talkTo })
          : t('chrome.wellbeing.didNotAsk')}
        {person.followUpRequested ? t('chrome.wellbeing.askedFollowUp') : ''}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`contact-status-${person.ownerUid}`}>{t('chrome.wellbeing.outcome')}</Label>
        <Select
          value={status || undefined}
          onValueChange={(value) => {
            if (value === 'resolved' || value === 'unresolved') setStatus(value);
          }}
        >
          <SelectTrigger id={`contact-status-${person.ownerUid}`} className="w-full">
            <SelectValue placeholder={t('chrome.wellbeing.selectOutcome')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`contact-comment-${person.ownerUid}`}>{t('chrome.wellbeing.comment')}</Label>
        <Textarea
          id={`contact-comment-${person.ownerUid}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          placeholder={t('chrome.wellbeing.contactCommentPlaceholder')}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={!canSave} onClick={() => void onSave()}>
          {save.isPending ? t('chrome.wellbeing.saving') : t('actions.save')}
        </Button>
        {savedStatus ? (
          <p className="text-xs text-muted-foreground">
            {t('chrome.wellbeing.savedAs', {
              status:
                savedStatus === 'resolved'
                  ? t('chrome.wellbeing.resolved')
                  : t('chrome.wellbeing.unresolved'),
            })}
          </p>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
