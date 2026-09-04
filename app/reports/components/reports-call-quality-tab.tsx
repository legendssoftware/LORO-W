'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCallQualityReport } from '@/api/endpoints/reports-call-quality';
import {
  useApiClient,
  useBranches,
  useSessionSync,
  useTokenReady,
  useUser,
} from '@/api/hooks';
import type { CallQualityRepRow, CallQualityReviewCall } from '@/api/types/reports-call-quality';
import { CallScoreRadialChart } from '@/app/calls/components/call-score-radial-chart';
import { CallPartyLabel } from '@/app/calls/components/call-party-label';
import { formatCallScore } from '@/app/calls/call-display';
import { dimensionScoreToPercent } from '@/app/calls/lib/score-colors';
import { CallScoreBar } from '@/app/calls/components/call-score-bar';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { matchNamedParty, type MatchedCallParty } from '@/lib/utils/call-party-match';
import { getReportsDataScope } from '@/lib/access';
import { utcMonthStartThroughToday } from '@/lib/utils/overview-daily-summary';
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
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
  toDonutSlices,
} from '../lib/reports-dashboard-chart-helpers';
import {
  formatCallSecondsPhrase,
  utcYmdToday,
} from '../lib/reports-call-quality-format';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsMissedQuestionsPieChart } from './reports-missed-questions-pie-chart';
import { ReportsNamedBarChart } from './reports-named-bar-chart';
import { ReportsGroupedBarChart } from './reports-grouped-bar-chart';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsCoachingRecommendationDetailDialog } from './reports-coaching-recommendation-detail-dialog';
import { ReportsCallQualitySourceStrip } from './reports-call-quality-source-strip';
import { ReportsCallQualityRateRadial } from './reports-call-quality-rate-radial';
import { ReportsCallArchetypeChart } from './reports-call-archetype-chart';
import { ReportsCallQualityFunnel } from './reports-call-quality-funnel';
import { ReportsCallBehaviourPanel } from './reports-call-behaviour-panel';
import { ReportsCallReviewCard } from './reports-call-review-card';
import { ReportsCallQualityTrendChart } from './reports-call-quality-trend-chart';
import {
  compareCallQualityReps,
  ReportsCallQualityLeaderboard,
  type CallQualityLeaderboardSortKey,
  type CallQualitySortDir,
} from './reports-call-quality-leaderboard';

const TOP_N = 5;

function SummaryStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
          tone === 'good' && 'text-green-700',
          tone === 'bad' && 'text-red-700',
          (!tone || tone === 'neutral') && 'text-foreground',
        )}
      >
        {value}
      </p>
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

function reviewToParty(
  call: CallQualityReviewCall,
  matchIndex: ReturnType<typeof buildCallQualityMatchIndex> | null,
): MatchedCallParty {
  if (matchIndex && call.ownerExtension) {
    const matched = matchNamedParty(call.ownerName, call.ownerExtension, matchIndex);
    if (matched.label && matched.label !== '—') return matched;
  }
  return {
    kind: 'agent',
    label: call.ownerName ?? 'Unknown agent',
    branch: null,
    user: null,
  };
}

function scoreDistributionFromResponse(
  distribution:
    | { excellent: number; good: number; needsImprovement: number; poor: number }
    | undefined,
) {
  if (!distribution) return null;
  return toDonutSlices(
    [
      { name: 'Excellent (85+)', value: distribution.excellent },
      { name: 'Good (70–84)', value: distribution.good },
      { name: 'Needs improvement (55–69)', value: distribution.needsImprovement },
      { name: 'Poor (<55)', value: distribution.poor },
    ],
    [REPORTS_CHART_GREEN, REPORTS_CHART_BLUE, REPORTS_CHART_AMBER, REPORTS_CHART_RED],
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
      {rep.branchName ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{rep.branchName}</p>
      ) : null}
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
    mtdDefault.end,
  );
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortKey, setSortKey] = useState<CallQualityLeaderboardSortKey>('qualityConversationRate');
  const [sortDir, setSortDir] = useState<CallQualitySortDir>('desc');

  const branchIdFilter =
    isMultiUser && branchFilter !== 'all' && Number.isFinite(Number(branchFilter))
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
    [scope, backendUserData?.uid, selfProfileQuery.data?.managedStaff],
  );

  const branchesQuery = useBranches({ enabled: isTokenReady && isMultiUser });
  const usersQuery = useQuery({
    queryKey: [...REPORTS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchReportsOrgUsers(client),
    enabled: isTokenReady && isMultiUser,
    staleTime: 5 * 60 * 1000,
  });

  const allowlistedUsers = useMemo(
    () => (usersQuery.data ?? []).filter((user) => userUidInAllowlist(user.uid, allowlistUids)),
    [usersQuery.data, allowlistUids],
  );

  const reportParams = useMemo(
    () => ({
      from,
      to,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
      ...(userIdFilter != null ? { userUid: userIdFilter } : {}),
    }),
    [from, to, branchIdFilter, userIdFilter],
  );

  const matchIndex = useMemo(
    () => (usersQuery.data ? buildCallQualityMatchIndex(usersQuery.data, branchesQuery.data ?? []) : null),
    [usersQuery.data, branchesQuery.data],
  );

  const rangeIncludesToday = to === utcYmdToday();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'call-quality', reportParams],
    queryFn: () => getCallQualityReport(client, reportParams),
    enabled: isTokenReady,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: rangeIncludesToday ? 'always' : false,
  });

  const labels = useMemo(
    () => (data ? repLabelMap(data.reps, matchIndex) : new Map<string, string>()),
    [data, matchIndex],
  );

  function handleSort(key: CallQualityLeaderboardSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'ownerName' || key === 'branchName' ? 'asc' : 'desc');
    }
  }

  const sortedReps = useMemo(() => {
    if (!data?.reps) return [];
    const rows = [...data.reps];
    rows.sort((a, b) => {
      const cmp = compareCallQualityReps(a, b, sortKey, labels);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [data?.reps, sortKey, sortDir, labels]);

  const scoreDistribution = useMemo(
    () => scoreDistributionFromResponse(data?.scoreDistribution),
    [data?.scoreDistribution],
  );

  const durationBars = useMemo(
    () =>
      (data?.duration.buckets ?? [])
        .filter((bucket) => bucket.count > 0)
        .map((bucket) => ({ name: bucket.label, value: bucket.count })),
    [data?.duration.buckets],
  );

  const branchBars = useMemo(
    () =>
      (data?.branches ?? []).slice(0, TOP_N).map((branch) => ({
        name: branch.branchName.slice(0, 24),
        quality: branch.qualityConversations,
        missed: branch.missedOpportunitiesCount,
      })),
    [data?.branches],
  );

  const coachingReps = useMemo(
    () => (data?.reps.filter((rep) => rep.coachingRecommendations.length > 0) ?? []).slice(0, TOP_N),
    [data?.reps],
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

  const topReviews = data.callsNeedingReview.slice(0, TOP_N);
  const topMissedQuestions = data.missedQuestions.slice(0, TOP_N);
  const greetingBehaviour = data.behaviour.find((row) => row.id === 'professional_introduction');

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

      <ReportsCallQualitySourceStrip sources={data.sources} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center px-2 py-3">
            <ReportsCallQualityRateRadial
              rate={data.qualityConversationRate}
              label="Quality conversation rate"
            />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center px-2 py-3">
            <CallScoreRadialChart score={data.avgScoreOverall ?? 0} compact hideCaption />
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Avg quality {formatCallScore(data.avgScoreOverall)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center px-2 py-3">
            <ReportsCallQualityRateRadial
              rate={greetingBehaviour?.passRate ?? data.greetingPassRate}
              label="Greeting pass"
            />
          </CardContent>
        </Card>
        <div className="grid gap-2">
          <SummaryStat
            label="Median duration"
            value={formatCallSecondsPhrase(data.medianDurationSeconds)}
            sub={
              data.duration.qualityConversationMedianSeconds != null
                ? `Quality conversations ${formatCallSecondsPhrase(data.duration.qualityConversationMedianSeconds)}`
                : `${data.totalCalls} recordings`
            }
          />
          <SummaryStat
            label="Opportunities"
            value={String(data.funnel.immediateOpportunitiesFound)}
            sub={`${data.funnel.projectsIdentified} projects identified`}
            tone="good"
          />
          <SummaryStat
            label="Missed pursuits"
            value={String(data.missedOpportunitiesCount)}
            sub="Customer volunteered, rep did not pursue"
            tone="bad"
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-base">Typical call</CardTitle>
          <p className="text-sm text-muted-foreground">
            What happens on most recordings in this period, from the org scorecard — not check-in
            counts.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-sm leading-relaxed text-foreground">{data.typicalCall.sentence}</p>
        </CardContent>
      </Card>

      {data.funnel ? (
        <Card className="shadow-sm">
          <CardHeader className="px-4 pb-2 pt-4">
            <CardTitle className="text-base">Opportunity funnel</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pipeline from decision-makers reached. Red drop-off is the share lost between steps.
              Quotes count only when the quotation client matches a call in this period.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <ReportsCallQualityFunnel funnel={data.funnel} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportsChartCard
          title="What happens on calls"
          description="Mutually exclusive archetypes"
          contentClassName="px-2 pb-3 pt-1"
        >
          <ReportsCallArchetypeChart archetypes={data.archetypes} />
        </ReportsChartCard>

        <ReportsChartCard
          title="Call duration"
          description={
            data.duration.qualityConversationMedianSeconds != null
              ? `Median ${formatCallSecondsPhrase(data.medianDurationSeconds)} · quality conversations ${formatCallSecondsPhrase(data.duration.qualityConversationMedianSeconds)}`
              : `Median ${formatCallSecondsPhrase(data.medianDurationSeconds)}`
          }
          contentClassName="px-2 pb-3 pt-1"
        >
          {durationBars.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No durations recorded</p>
          ) : (
            <ReportsNamedBarChart data={durationBars} yAxisLabel="Calls" heightClassName="h-[200px]" />
          )}
        </ReportsChartCard>
      </div>

      {data.behaviour.length > 0 ? (
        <ReportsChartCard
          title="Greeting and etiquette"
          description="Org scorecard behaviour metrics (coaching-only — not in overall quality)"
          contentClassName="px-3 pb-3 pt-1"
        >
          <ReportsCallBehaviourPanel behaviour={data.behaviour} />
        </ReportsChartCard>
      ) : null}

      {data.daily.length > 1 ? (
        <ReportsChartCard
          title="Daily recordings vs quality conversations"
          description={`${data.sources.from} – ${data.sources.to}`}
          contentClassName="px-2 pb-3 pt-1"
        >
          <ReportsCallQualityTrendChart daily={data.daily} />
        </ReportsChartCard>
      ) : null}

      {branchBars.length > 1 ? (
        <ReportsChartCard
          title="Branch comparison"
          description="Quality conversations vs missed pursuits"
          contentClassName="px-2 pb-3 pt-1"
        >
          <ReportsGroupedBarChart
            data={branchBars}
            categoryKey="name"
            series={[
              { key: 'quality', label: 'Quality conversations', color: REPORTS_CHART_GREEN },
              { key: 'missed', label: 'Missed pursuits', color: REPORTS_CHART_RED },
            ]}
            yAxisLabel="Calls"
            heightClassName="h-[220px]"
          />
        </ReportsChartCard>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-base">Salesperson leaderboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sorted by quality conversation rate, then average quality. High call volume alone does
            not rank first.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto px-4 pb-4 pt-0">
          <ReportsCallQualityLeaderboard
            reps={sortedReps}
            labels={labels}
            partyForRep={(rep, displayName) => repToParty(rep, displayName, matchIndex)}
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
          title="Script area scores"
          description="Team average by scorecard area (0–10), with pass / fail"
          contentClassName="px-3 pb-3 pt-1"
        >
          {data.scoreByDimension.length === 0 ? (
            <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
              No dimension scores yet
            </p>
          ) : (
            <ul className="space-y-2.5 py-1">
              {data.scoreByDimension.map((row) => {
                const clamped = Math.min(10, Math.max(0, row.avgScore));
                const total = row.passCount + row.failCount;
                return (
                  <li key={row.dimension} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {row.label}
                        {!row.affectsScore ? (
                          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            coaching
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{clamped.toFixed(1)}/10</span>
                    </div>
                    <CallScoreBar value={dimensionScoreToPercent(clamped)} />
                    {total > 0 ? (
                      <p className="text-[11px] tabular-nums">
                        <span className="text-green-700">{row.passCount} passed</span>
                        <span className="mx-1 text-muted-foreground">·</span>
                        <span className="text-red-700">{row.failCount} failed</span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
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

        <ReportsChartCard
          title="Calls requiring manager review"
          description={`Top ${TOP_N} flagged calls`}
          contentClassName="px-3 pb-3 pt-1"
        >
          {data.callsNeedingReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls flagged for review in this period.</p>
          ) : (
            <div className="space-y-2">
              {topReviews.map((call) => (
                <ReportsCallReviewCard
                  key={call.uid}
                  call={call}
                  party={reviewToParty(call, matchIndex)}
                />
              ))}
            </div>
          )}
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
