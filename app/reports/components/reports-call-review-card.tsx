'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { CallQualityReviewCall } from '@/api/types/reports-call-quality';
import { CallScoreRadialChart } from '@/app/calls/components/call-score-radial-chart';
import { CallPartyLabel } from '@/app/calls/components/call-party-label';
import { formatCallDuration, formatCallScore } from '@/app/calls/call-display';
import { getScoreColorClasses } from '@/app/calls/lib/score-colors';
import { ORIGIN_LABEL, normalizeOrigin } from '@/app/calls/origin-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MatchedCallParty } from '@/lib/utils/call-party-match';
import { ReportsCallOutcomeChip } from './reports-call-outcome-chip';

export function ReportsCallReviewCard({
  call,
  party,
}: {
  call: CallQualityReviewCall;
  party: MatchedCallParty;
}) {
  const origin = call.origin ? ORIGIN_LABEL[normalizeOrigin(call.origin)] : null;
  const scoreColors = getScoreColorClasses(call.scoreOverall ?? 0);

  return (
    <div className="flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm">
      {call.scoreOverall != null ? (
        <div className="shrink-0 pt-0.5">
          <CallScoreRadialChart score={call.scoreOverall} compact hideCaption />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/calls?uid=${call.uid}`} className="min-w-0 hover:underline">
            <CallPartyLabel party={party} />
          </Link>
          <span className={cn('shrink-0 tabular-nums text-sm font-semibold', scoreColors.text)}>
            {formatCallScore(call.scoreOverall)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {call.startedAt ? format(new Date(call.startedAt), 'dd MMM yyyy HH:mm') : 'Unknown time'}
          {call.branchName ? ` · ${call.branchName}` : ''}
          {' · '}
          {formatCallDuration(call.durationSeconds)}
          {origin ? ` · ${origin}` : ''}
        </p>
        {call.fromLabel || call.toLabel ? (
          <p className="truncate text-xs text-muted-foreground">
            {call.fromLabel ?? '—'} → {call.toLabel ?? '—'}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {call.leadUid != null ? (
            <Badge variant="outline" className="text-[10px]">
              Lead
            </Badge>
          ) : null}
          {call.clientUid != null ? (
            <Badge variant="outline" className="text-[10px]">
              Client
            </Badge>
          ) : null}
          {call.outcomeChips.map((chip) => (
            <ReportsCallOutcomeChip key={chip.id} id={chip.id} label={chip.label} value={chip.value} />
          ))}
        </div>
        <ul className="list-disc space-y-0.5 pl-4 text-xs leading-snug text-muted-foreground">
          {call.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
