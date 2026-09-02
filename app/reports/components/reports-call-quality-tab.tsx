'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { getCallQualityReport } from '@/api/endpoints/reports-call-quality';
import {
  useApiClient,
  useBranches,
  useSessionSync,
  useTokenReady,
  useUser,
} from '@/api/hooks';
import type { CallQualityRepRow, CallQualityReviewCall } from '@/api/types/reports-call-quality';
import { CallScoreBar } from '@/app/calls/components/call-score-bar';
import { CallScoreRadialChart } from '@/app/calls/components/call-score-radial-chart';
import { CallPartyLabel } from '@/app/calls/components/call-party-label';
import {
  CALL_SCORE_DIMENSIONS,
  callScoreDimensionLabel,
  formatCallScore,
} from '@/app/calls/call-display';
import type { CallScoreDimension } from '@/api/types/calls';
import { dimensionScoreToPercent, getScoreColorClasses } from '@/app/calls/lib/score-colors';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { matchNamedParty, type MatchedCallParty } from '@/lib/utils/call-party-match';
import { getReportsDataScope } from '@/lib/access';
import { utcDateFromYmd, utcMonthStartThroughToday } from '@/lib/utils/overview-daily-summary';
import { cn } from '@/lib/utils';
import {
  fetchReportsOrgUsers,
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
} from '../lib/reports-scope-allowlist';
import {
  buildCallQualityMatchIndex,
  repLabelMap,
  resolveRepDisplayName,
} from '../lib/reports-call-quality-labels';
import { useReportsDateRange } from '../lib/use-reports-date-range';
import {
  REPORTS_CHART_AMBER,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
  toDonutSlices,
} from '../lib/reports-dashboard-chart-helpers';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsMissedQuestionsPieChart } from './reports-missed-questions-pie-chart';
import { ReportsNamedBarChart } from './reports-named-bar-chart';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsCoachingRecommendationDetailDialog } from './reports-coaching-recommendation-detail-dialog';

const TOP_N = 5;

type SortKey = 'ownerName' | 'callCount' | 'avgScore' | 'missedQuestionsCount';
type SortDir = 'asc' | 'desc';

function periodDayCount(fromYmd: string, toYmd: string): number {
  const start = utcDateFromYmd(fromYmd);
  const end = utcDateFromYmd(toYmd);
  const orderedStart = start <= end ? start : end;
  const orderedEnd = start <= end ? end : start;
  const ms = orderedEnd.getTime() - orderedStart.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function repToParty(
  rep: CallQualityRepRow,
  displayName: string,
  matchIndex: ReturnType<typeof buildCallQualityMatchIndex> | null,
): MatchedCallParty {
  if (matchIndex && rep.ownerExtension) {
    const matched = matchNamedParty(null, rep.ownerExtension, matchIndex);
    if (matched.user) {
      return { ...matched, label: displayName, kind: 'agent' };
    }
  }
  return {
    kind: 'agent',
    label: displayName,
    branch: null,
    user: null,
  };
}

function scoreDistributionFromResponse(
  distribution: { excellent: number; fair: number; poor: number } | undefined
) {
  if (!distribution) return null;
  return toDonutSlices(
    [
      { name: 'Excellent (70+)', value: distribution.excellent },
      { name: 'Fair (40–69)', value: distribution.fair },
      { name: 'Poor (<40)', value: distribution.poor },
    ],
    [REPORTS_CHART_GREEN, REPORTS_CHART_AMBER, REPORTS_CHART_RED],
  );
}

function LeaderboardTable({
  reps,
  labels,
  matchIndex,
  sortKey,
  sortDir,
  onSort,
}: {
  reps: CallQualityRepRow[];
  labels: Map<string, string>;
  matchIndex: ReturnType<typeof buildCallQualityMatchIndex> | null;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-3">
            <SortHeader
              label="Agent"
              sortKey="ownerName"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Calls"
              sortKey="callCount"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Avg score"
              sortKey="avgScore"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="py-3">
            <SortHeader
              label="Missed questions"
              sortKey="missedQuestionsCount"
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
          const party = repToParty(rep, displayName, matchIndex);
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
              <TableCell className="py-3 tabular-nums">{rep.callCount}</TableCell>
              <TableCell className="py-3">
                <div className="flex min-w-[120px] items-center gap-2">
                  <CallScoreBar value={score} className="max-w-[72px] flex-1" />
                  <span className={cn('shrink-0 tabular-nums text-sm font-medium', colors.text)}>
                    {formatCallScore(rep.avgScore)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-3 tabular-nums">{rep.missedQuestionsCount}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 font-medium hover:text-foreground',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <Icon className="size-3.5 opacity-60" aria-hidden />
    </button>
  );
}

function CoachingRepRecommendations({
  rep,
  labels,
  matchIndex,
}: {
  rep: CallQualityRepRow;
  labels: Map<string, string>;
  matchIndex: ReturnType<typeof buildCallQualityMatchIndex> | null;
}) {
  const name = labels.get(rep.ownerClerkUserId) ?? resolveRepDisplayName(rep, matchIndex);
  const party = repToParty(rep, name, matchIndex);
  const agentHref = rep.isUnlinked
    ? undefined
    : `/calls?ownerClerkUserId=${encodeURIComponent(rep.ownerClerkUserId)}`;

  return (
    <div className="rounded-md border px-3 py-2.5">
      <CallPartyLabel party={party} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {rep.coachingRecommendations.slice(0, TOP_N).map((item) => (
          <ReportsCoachingRecommendationDetailDialog
            key={item}
            recommendation={item}
            agentParty={party}
            agentHref={agentHref}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewCallRow({ call }: { call: CallQualityReviewCall }) {
  return (
    <div className="flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm">
      {call.scoreOverall != null ? (
        <div className="shrink-0 pt-0.5">
          <CallScoreRadialChart score={call.scoreOverall} compact hideCaption />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/calls?uid=${call.uid}`}
            className="font-medium leading-snug text-primary hover:underline"
          >
            {call.ownerName ?? 'Unknown agent'}
          </Link>
          <span
            className={cn(
              'shrink-0 tabular-nums text-sm font-semibold',
              getScoreColorClasses(call.scoreOverall ?? 0).text
            )}
          >
            {formatCallScore(call.scoreOverall)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {call.startedAt
            ? format(new Date(call.startedAt), 'dd MMM yyyy HH:mm')
            : 'Unknown time'}
        </p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs leading-snug text-muted-foreground">
          {call.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ReportsCallQualityTab() {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const accessLevel = backendUserData?.accessLevel;
  const scope = getReportsDataScope(accessLevel);
  const isMultiUser = scope !== 'self';
  const selfRef =
    backendUserData?.clerkUserId?.trim() ||
    (backendUserData?.uid != null ? String(backendUserData.uid) : null);

  const mtdDefault = useMemo(() => utcMonthStartThroughToday(), []);
  const { startDate, endDate, from, to, setRange } = useReportsDateRange(
    mtdDefault.start,
    mtdDefault.end
  );
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('avgScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const branchIdFilter =
    isMultiUser &&
    branchFilter !== 'all' &&
    Number.isFinite(Number(branchFilter))
      ? Number(branchFilter)
      : null;
  const userIdFilter = useMemo(() => {
    if (!isMultiUser) {
      return backendUserData?.uid != null && Number.isFinite(backendUserData.uid)
        ? Number(backendUserData.uid)
        : null;
    }
    if (userFilter !== 'all' && Number.isFinite(Number(userFilter))) {
      return Number(userFilter);
    }
    return null;
  }, [isMultiUser, backendUserData?.uid, userFilter]);

  const selfProfileQuery = useUser(selfRef, {
    enabled: isTokenReady && scope === 'team' && !!selfRef,
    includeAssignedClients: false,
  });

  const allowlistUids = useMemo(
    () =>
      resolveReportsAllowlistUids({
        scope,
        selfUid: backendUserData?.uid,
        managedStaff: selfProfileQuery.data?.managedStaff,
      }),
    [scope, backendUserData?.uid, selfProfileQuery.data?.managedStaff]
  );

  const branchesQuery = useBranches({ enabled: isTokenReady && isMultiUser });
  const usersQuery = useQuery({
    queryKey: [...REPORTS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchReportsOrgUsers(client),
    enabled: isTokenReady && isMultiUser,
    staleTime: 5 * 60 * 1000,
  });

  const allowlistedUsers = useMemo(
    () =>
      (usersQuery.data ?? []).filter((user) => userUidInAllowlist(user.uid, allowlistUids)),
    [usersQuery.data, allowlistUids]
  );

  const reportParams = useMemo(
    () => ({
      from,
      to,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
      ...(userIdFilter != null ? { userUid: userIdFilter } : {}),
    }),
    [from, to, branchIdFilter, userIdFilter]
  );

  const matchIndex = useMemo(
    () =>
      usersQuery.data
        ? buildCallQualityMatchIndex(usersQuery.data, branchesQuery.data ?? [])
        : null,
    [usersQuery.data, branchesQuery.data]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'call-quality', reportParams],
    queryFn: () => getCallQualityReport(client, reportParams),
    enabled: isTokenReady,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });

  const labels = useMemo(
    () => (data ? repLabelMap(data.reps, matchIndex) : new Map<string, string>()),
    [data, matchIndex]
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'ownerName' ? 'asc' : 'desc');
    }
  }

  const sortedReps = useMemo(() => {
    if (!data?.reps) return [];
    const rows = [...data.reps];
    rows.sort((a, b) => {
      const nameA = labels.get(a.ownerClerkUserId) ?? a.ownerName ?? '';
      const nameB = labels.get(b.ownerClerkUserId) ?? b.ownerName ?? '';
      let cmp = 0;
      switch (sortKey) {
        case 'ownerName':
          cmp = nameA.localeCompare(nameB);
          break;
        case 'callCount':
          cmp = a.callCount - b.callCount;
          break;
        case 'avgScore':
          cmp = (a.avgScore ?? -1) - (b.avgScore ?? -1);
          break;
        case 'missedQuestionsCount':
          cmp = a.missedQuestionsCount - b.missedQuestionsCount;
          break;
        default: {
          const _exhaustive: never = sortKey;
          return _exhaustive;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [data?.reps, sortKey, sortDir, labels]);

  const repScoreBars = useMemo(
    () =>
      sortedReps
        .filter((rep) => rep.avgScore != null)
        .slice(0, TOP_N)
        .map((rep) => ({
          name: (labels.get(rep.ownerClerkUserId) ?? rep.ownerName ?? 'Unknown').slice(0, 24),
          value: Math.round(rep.avgScore ?? 0),
        })),
    [sortedReps, labels]
  );

  const scoreDistribution = useMemo(
    () => scoreDistributionFromResponse(data?.scoreDistribution),
    [data?.scoreDistribution]
  );

  const periodTarget = useMemo(() => {
    if (!data) return 0;
    return data.dailyCallTarget * periodDayCount(from, to);
  }, [data, from, to]);

  const reviewScoreBars = useMemo(
    () =>
      (data?.callsNeedingReview ?? [])
        .filter((call) => call.scoreOverall != null)
        .slice(0, TOP_N)
        .map((call) => ({
          name: (call.ownerName ?? 'Unknown').slice(0, 20),
          value: Math.round(call.scoreOverall ?? 0),
        })),
    [data?.callsNeedingReview]
  );

  const coachingReps = useMemo(
    () =>
      (data?.reps.filter((rep) => rep.coachingRecommendations.length > 0) ?? []).slice(0, TOP_N),
    [data?.reps]
  );

  if (!isTokenReady || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load call quality report.</p>;
  }

  const topReps = sortedReps.slice(0, TOP_N);
  const topReviews = data.callsNeedingReview.slice(0, TOP_N);
  const topMissedQuestions = data.missedQuestions.slice(0, TOP_N);
  const targetProgressPct =
    periodTarget > 0 ? Math.round((data.totalCalls / periodTarget) * 100) : null;

  return (
    <div className="space-y-5 pb-8">
      <ReportsDashboardToolbar
        startDate={startDate}
        endDate={endDate}
        onRangeChange={setRange}
        showDimensionFilters={isMultiUser}
        branches={branchesQuery.data}
        users={allowlistedUsers}
        selectedBranchId={branchFilter}
        onBranchChange={setBranchFilter}
        selectedUserId={userFilter}
        onUserChange={setUserFilter}
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryStat label="Total calls" value={String(data.totalCalls)} />
        <SummaryStat
          label="Avg score"
          value={formatCallScore(data.avgScoreOverall)}
          sub={
            data.scoreDistribution.totalScored > 0
              ? `${data.scoreDistribution.totalScored} scored`
              : 'No scored calls yet'
          }
        />
        <SummaryStat
          label="Calls vs target"
          value={`${data.totalCalls} / ${periodTarget}`}
          sub={
            targetProgressPct != null
              ? `${targetProgressPct}% of period target`
              : `${data.dailyCallTarget}/day target`
          }
        />
        <SummaryStat
          label="Conversion"
          value={data.conversionRate != null ? `${data.conversionRate}%` : '—'}
          sub="Leads to quotations in range"
        />
        <SummaryStat
          label="Needs review"
          value={String(data.callsNeedingReview.length)}
          sub="Flagged in this period"
        />
        <SummaryStat
          label="Unlinked calls"
          value={String(data.unlinkedCallCount)}
          sub="Not matched to a user"
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-base">Salesperson leaderboard</CardTitle>
          <p className="text-sm text-muted-foreground">Top {TOP_N} agents in this period</p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-4 pb-4 pt-0">
          <LeaderboardTable
            reps={topReps}
            labels={labels}
            matchIndex={matchIndex}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportsChartCard
          title="Most missed questions"
          description={`Top ${TOP_N} missed scorecard items`}
          contentClassName="px-2 pb-3 pt-1"
        >
          <ReportsMissedQuestionsPieChart questions={topMissedQuestions} maxSlices={TOP_N} />
        </ReportsChartCard>

        <ReportsChartCard
          title="Dimension scores"
          description="Team average by call quality dimension (0–10)"
          contentClassName="px-3 pb-3 pt-1"
        >
          {data.scoreByDimension.length === 0 ? (
            <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
              No dimension scores yet
            </p>
          ) : (
            <ul className="space-y-2.5 py-1">
              {CALL_SCORE_DIMENSIONS.map((dimension) => {
                const row = data.scoreByDimension.find((d) => d.dimension === dimension);
                if (!row) return null;
                const clamped = Math.min(10, Math.max(0, row.avgScore));
                return (
                  <li key={dimension} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>{callScoreDimensionLabel(dimension as CallScoreDimension)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {clamped.toFixed(1)}/10
                      </span>
                    </div>
                    <CallScoreBar value={dimensionScoreToPercent(clamped)} />
                  </li>
                );
              })}
            </ul>
          )}
        </ReportsChartCard>

        <ReportsChartCard
          title="Rep average scores"
          description={`Top ${TOP_N} agents by average call score`}
          contentClassName="px-2 pb-3 pt-1"
        >
          {repScoreBars.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No scored calls</p>
          ) : (
            <ReportsNamedBarChart
              data={repScoreBars}
              yAxisLabel="Score"
              heightClassName="h-[200px]"
            />
          )}
        </ReportsChartCard>

        <ReportsChartCard
          title="Score distribution"
          description="Scored calls grouped by individual call score"
          contentClassName="px-2 pb-3 pt-1"
        >
          {!scoreDistribution || scoreDistribution.total <= 0 ? (
            <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
              No scored calls
            </p>
          ) : (
            <ReportDonutChart
              config={scoreDistribution.config}
              data={scoreDistribution.slices}
              centerPrimary={String(scoreDistribution.total)}
              centerSecondary="Calls"
            />
          )}
        </ReportsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportsChartCard
          title="Calls requiring manager review"
          description={`Top ${TOP_N} flagged calls`}
          contentClassName="px-3 pb-3 pt-1"
        >
          {reviewScoreBars.length > 0 ? (
            <ReportsNamedBarChart
              data={reviewScoreBars}
              yAxisLabel="Score"
              heightClassName="h-[160px]"
            />
          ) : null}
          <div className="mt-2">
            {data.callsNeedingReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No calls flagged for review in this period.
              </p>
            ) : (
              <div className="space-y-2">
                {topReviews.map((call) => (
                  <ReviewCallRow key={call.uid} call={call} />
                ))}
              </div>
            )}
          </div>
        </ReportsChartCard>

        {coachingReps.length > 0 ? (
          <ReportsChartCard
            title="Coaching recommendations"
            description={`Top ${TOP_N} agents with coaching notes`}
            contentClassName="px-3 pb-3 pt-1"
          >
            <div className="space-y-2">
              {coachingReps.map((rep) => (
                <CoachingRepRecommendations
                  key={rep.ownerClerkUserId}
                  rep={rep}
                  labels={labels}
                  matchIndex={matchIndex}
                />
              ))}
            </div>
          </ReportsChartCard>
        ) : null}
      </div>
    </div>
  );
}
