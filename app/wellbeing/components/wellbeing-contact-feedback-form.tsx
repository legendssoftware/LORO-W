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
import { TALK_TO_LABELS } from '../lib/pulse-explain';

const STATUS_OPTIONS: { value: PulseContactStatus; label: string }[] = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'unresolved', label: 'Unresolved' },
];

function saveErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ');
    }
  }
  return 'Could not save contact feedback.';
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
  const save = useSavePulseContactFeedbackMutation();
  const [status, setStatus] = useState<PulseContactStatus | ''>(person.contactFeedback?.status ?? '');
  const [comment, setComment] = useState(person.contactFeedback?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const askedToTalk = person.talkTo !== 'none';
  const canSave = status !== '' && comment.trim().length > 0 && date.length > 0 && !save.isPending;
  const savedStatus = save.data?.status ?? person.contactFeedback?.status ?? null;

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
      setError(saveErrorMessage(caught));
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
      <p className="text-xs text-muted-foreground">
        {askedToTalk ? `Asked to speak to ${TALK_TO_LABELS[person.talkTo]}.` : 'Did not ask to speak to anyone.'}
        {person.followUpRequested ? ' Asked for a follow-up.' : ''}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`contact-status-${person.ownerUid}`}>Outcome</Label>
        <Select
          value={status || undefined}
          onValueChange={(value) => {
            if (value === 'resolved' || value === 'unresolved') setStatus(value);
          }}
        >
          <SelectTrigger id={`contact-status-${person.ownerUid}`} className="w-full">
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`contact-comment-${person.ownerUid}`}>Comment</Label>
        <Textarea
          id={`contact-comment-${person.ownerUid}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          placeholder="What happened when you made contact"
          rows={3}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={!canSave} onClick={() => void onSave()}>
          {save.isPending ? 'Saving' : 'Save'}
        </Button>
        {savedStatus ? (
          <p className="text-xs text-muted-foreground">
            Saved as {savedStatus === 'resolved' ? 'Resolved' : 'Unresolved'}
          </p>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
