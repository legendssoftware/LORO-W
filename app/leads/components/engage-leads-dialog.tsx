'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const BULK_ENGAGE_MAX = 100;

type EngageChannel = 'email' | 'sms' | 'whatsapp';
type EngageTone = 'professional' | 'friendly' | 'formal';
type EngageCasualness = 'casual' | 'neutral' | 'formal';

type EngageLeadsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Leads matching the current list filters, including those missing a contact. */
  matchCount: number;
  filters: BulkEngageFilters;
};

function channelLabel(channel: EngageChannel): string {
  switch (channel) {
    case 'email':
      return 'Email';
    case 'sms':
      return 'SMS';
    case 'whatsapp':
      return 'WhatsApp';
    default: {
      const unreachable: never = channel;
      return unreachable;
    }
  }
}

function skippedContactLabel(channel: EngageChannel): string {
  switch (channel) {
    case 'email':
      return 'an email address';
    case 'sms':
      return 'a phone number';
    case 'whatsapp':
      return 'a WhatsApp or phone number';
    default: {
      const unreachable: never = channel;
      return unreachable;
    }
  }
}

function resultToast(data: BulkEngageResponse): string {
  if (data.matched === 0) return data.message || 'No leads match these filters';
  return `Sent ${data.sent}. Skipped ${data.skipped}. Failed ${data.failed}.`;
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
  const [channel, setChannel] = useState<EngageChannel | null>(null);
  const [tone, setTone] = useState<EngageTone>('professional');
  const [casualness, setCasualness] = useState<EngageCasualness>('neutral');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const draftMutation = useEngageCampaignDraftMutation();
  const sendMutation = useSendBulkLeadEngageMutation();

  useEffect(() => {
    if (open) return;
    setChannel(null);
    setTone('professional');
    setCasualness('neutral');
    setMessage('');
    setConfirming(false);
  }, [open]);

  const overCap = matchCount > BULK_ENGAGE_MAX;
  const canSend = Boolean(channel && message.trim() && matchCount > 0 && !overCap);

  function handleWriteWithAi() {
    if (!channel) return;
    draftMutation.mutate(
      { channel, tone, casualness },
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
          toast.success(resultToast(data));
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Engage leads</DialogTitle>
          <DialogDescription>
            {channel
              ? `${matchCount} lead${matchCount === 1 ? '' : 's'} match the current filters. Leads without ${skippedContactLabel(channel)} are skipped.`
              : `${matchCount} lead${matchCount === 1 ? '' : 's'} match the current filters.`}
            {overCap
              ? ` Narrow the filters to ${BULK_ENGAGE_MAX} or fewer before sending.`
              : ` At most ${BULK_ENGAGE_MAX} leads can be sent at once.`}
          </DialogDescription>
        </DialogHeader>

        {confirming && channel ? (
          <div className="space-y-3 text-sm">
            <p>
              Send this {channelLabel(channel)} message to up to {matchCount} leads matching your
              current filters?
            </p>
            <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-muted-foreground">
              {message.trim()}
            </p>
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
                Email
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`gap-1.5 ${channel === 'sms' ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700' : ''}`}
                onClick={() => setChannel('sms')}
              >
                <MessageSquare className="size-4" />
                SMS
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`gap-1.5 ${channel === 'whatsapp' ? 'border-green-600 bg-green-600 text-white hover:bg-green-700' : ''}`}
                onClick={() => setChannel('whatsapp')}
              >
                <MessageSquare className="size-4" />
                WhatsApp
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tone</Label>
                <Select value={tone} onValueChange={(value) => setTone(value as EngageTone)}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Casualness</Label>
                <Select
                  value={casualness}
                  onValueChange={(value) => setCasualness(value as EngageCasualness)}
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                className="resize-y text-sm"
                placeholder="Type the message, or let AI write a draft you can edit…"
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{name}}'} where the lead’s name should appear.
                {channel === 'sms' && message.length > 160
                  ? ' This SMS is longer than 160 characters and may be split.'
                  : ''}
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
                Back
              </Button>
              <Button
                type="button"
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={handleSend}
                disabled={!canSend || sendMutation.isPending}
              >
                {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Send'}
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
                Write with AI
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
