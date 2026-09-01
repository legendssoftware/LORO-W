'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CallPartyLabel } from '@/app/calls/components/call-party-label';
import type { MatchedCallParty } from '@/lib/utils/call-party-match';

interface ReportsCoachingRecommendationDetailDialogProps {
  recommendation: string;
  agentParty: MatchedCallParty;
  agentHref?: string;
  previewMaxLength?: number;
}

export function ReportsCoachingRecommendationDetailDialog({
  recommendation,
  agentParty,
  agentHref,
  previewMaxLength = 80,
}: ReportsCoachingRecommendationDetailDialogProps) {
  const preview =
    recommendation.length > previewMaxLength
      ? `${recommendation.slice(0, previewMaxLength - 1)}…`
      : recommendation;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border bg-secondary/60 px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-secondary-foreground transition-colors hover:bg-secondary"
        >
          {preview}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Coaching recommendation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</p>
            {agentHref ? (
              <Link href={agentHref} className="inline-flex hover:underline">
                <CallPartyLabel party={agentParty} />
              </Link>
            ) : (
              <CallPartyLabel party={agentParty} />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommendation
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{recommendation}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
