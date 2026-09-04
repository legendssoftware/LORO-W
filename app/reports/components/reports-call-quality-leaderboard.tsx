'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { CallQualityRepRow } from '@/api/types/reports-call-quality';
import { CallPartyLabel } from '@/app/calls/components/call-party-label';
import { CallScoreBar } from '@/app/calls/components/call-score-bar';
import { formatCallScore } from '@/app/calls/call-display';
import { getScoreColorClasses } from '@/app/calls/lib/score-colors';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { MatchedCallParty } from '@/lib/utils/call-party-match';
import {
  formatCallQualityRate,
  formatCallSecondsPhrase,
} from '../lib/reports-call-quality-format';

export type CallQualityLeaderboardSortKey =
  | 'ownerName'
  | 'branchName'
  | 'callCount'
  | 'decisionMakersReached'
  | 'qualityConversations'
  | 'opportunitiesFound'
  | 'boqsRequested'
  | 'followUpsBooked'
  | 'avgScore'
  | 'avgDurationSeconds'
  | 'greetingPassRate'
  | 'qualityConversationRate';

export type CallQualitySortDir = 'asc' | 'desc';

function rateTone(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return 'text-muted-foreground';
  return rate >= 50 ? 'text-green-700' : 'text-red-700';
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: CallQualityLeaderboardSortKey;
  activeKey: CallQualityLeaderboardSortKey;
  dir: CallQualitySortDir;
  onSort: (key: CallQualityLeaderboardSortKey) => void;
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <Icon className="size-3.5 opacity-60" aria-hidden />
    </button>
  );
}

export function ReportsCallQualityLeaderboard({
  reps,
  labels,
  partyForRep,
  sortKey,
  sortDir,
  onSort,
}: {
  reps: CallQualityRepRow[];
  labels: Map<string, string>;
  partyForRep: (rep: CallQualityRepRow, displayName: string) => MatchedCallParty;
  sortKey: CallQualityLeaderboardSortKey;
  sortDir: CallQualitySortDir;
  onSort: (key: CallQualityLeaderboardSortKey) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-3">
            <SortHeader label="Agent" sortKey="ownerName" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader label="Branch" sortKey="branchName" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader label="Calls" sortKey="callCount" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Decision makers"
              sortKey="decisionMakersReached"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Quality calls"
              sortKey="qualityConversations"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Opportunities"
              sortKey="opportunitiesFound"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader label="BOQs" sortKey="boqsRequested" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Follow-ups"
              sortKey="followUpsBooked"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Median duration"
              sortKey="avgDurationSeconds"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Greeting"
              sortKey="greetingPassRate"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader label="Avg quality" sortKey="avgScore" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Quality conversation rate"
              sortKey="qualityConversationRate"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reps.map((rep) => {
          const displayName = labels.get(rep.ownerClerkUserId) ?? rep.ownerName ?? 'Unknown';
          const score = rep.avgScore ?? 0;
          const colors = getScoreColorClasses(score);
          const party = partyForRep(rep, displayName);
          const href = rep.isUnlinked
            ? undefined
            : `/calls?ownerClerkUserId=${encodeURIComponent(rep.ownerClerkUserId)}`;

          return (
            <TableRow key={rep.ownerClerkUserId} className="hover:bg-muted/40">
              <TableCell className="py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {href ? (
                    <Link href={href} className="min-w-0 hover:underline">
                      <CallPartyLabel party={party} />
                    </Link>
                  ) : (
                    <CallPartyLabel party={party} />
                  )}
                  {rep.isUnlinked ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Unlinked
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">
                {rep.branchName ?? '—'}
              </TableCell>
              <TableCell className="py-3 tabular-nums">{rep.callCount}</TableCell>
              <TableCell className="py-3 tabular-nums">{rep.decisionMakersReached}</TableCell>
              <TableCell className="py-3 tabular-nums text-green-700">{rep.qualityConversations}</TableCell>
              <TableCell className="py-3 tabular-nums text-green-700">{rep.opportunitiesFound}</TableCell>
              <TableCell className="py-3 tabular-nums">{rep.boqsRequested}</TableCell>
              <TableCell className="py-3 tabular-nums">{rep.followUpsBooked}</TableCell>
              <TableCell className="py-3 tabular-nums">
                {formatCallSecondsPhrase(rep.avgDurationSeconds)}
              </TableCell>
              <TableCell className={cn('py-3 tabular-nums font-medium', rateTone(rep.greetingPassRate))}>
                {formatCallQualityRate(rep.greetingPassRate)}
              </TableCell>
              <TableCell className="py-3">
                <div className="flex min-w-[120px] items-center gap-2">
                  <CallScoreBar value={score} className="max-w-[72px] flex-1" />
                  <span className={cn('shrink-0 tabular-nums text-sm font-medium', colors.text)}>
                    {formatCallScore(rep.avgScore)}
                  </span>
                </div>
              </TableCell>
              <TableCell className={cn('py-3 tabular-nums font-medium', rateTone(rep.qualityConversationRate))}>
                {formatCallQualityRate(rep.qualityConversationRate)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function compareCallQualityReps(
  a: CallQualityRepRow,
  b: CallQualityRepRow,
  sortKey: CallQualityLeaderboardSortKey,
  labels: Map<string, string>,
): number {
  const nameA = labels.get(a.ownerClerkUserId) ?? a.ownerName ?? '';
  const nameB = labels.get(b.ownerClerkUserId) ?? b.ownerName ?? '';
  switch (sortKey) {
    case 'ownerName':
      return nameA.localeCompare(nameB);
    case 'branchName':
      return (a.branchName ?? '').localeCompare(b.branchName ?? '');
    case 'callCount':
      return a.callCount - b.callCount;
    case 'decisionMakersReached':
      return a.decisionMakersReached - b.decisionMakersReached;
    case 'qualityConversations':
      return a.qualityConversations - b.qualityConversations;
    case 'opportunitiesFound':
      return a.opportunitiesFound - b.opportunitiesFound;
    case 'boqsRequested':
      return a.boqsRequested - b.boqsRequested;
    case 'followUpsBooked':
      return a.followUpsBooked - b.followUpsBooked;
    case 'avgScore':
      return (a.avgScore ?? -1) - (b.avgScore ?? -1);
    case 'avgDurationSeconds':
      return (a.avgDurationSeconds ?? -1) - (b.avgDurationSeconds ?? -1);
    case 'greetingPassRate':
      return (a.greetingPassRate ?? -1) - (b.greetingPassRate ?? -1);
    case 'qualityConversationRate':
      return (a.qualityConversationRate ?? -1) - (b.qualityConversationRate ?? -1);
    default: {
      const _exhaustive: never = sortKey;
      return _exhaustive;
    }
  }
}
