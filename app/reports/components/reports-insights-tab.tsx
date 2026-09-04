'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActivityIntelligence } from '@/api/endpoints/reports-activity-intelligence';
import {
  useApiClient,
  useBranches,
  useSessionSync,
  useTokenReady,
  useUser,
} from '@/api/hooks';
import type { ActivityIntelligenceCluster } from '@/api/types/reports-activity-intelligence';
import { CallScoreRadialChart } from '@/app/calls/components/call-score-radial-chart';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getReportsDataScope } from '@/lib/access';
import { cn } from '@/lib/utils';
import {
  fetchReportsOrgUsers,
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
} from '../lib/reports-scope-allowlist';
import { useReportsDateRange } from '../lib/use-reports-date-range';
import { REPORTS_CHART_AMBER } from '../lib/reports-dashboard-chart-helpers';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsNamedBarChart } from './reports-named-bar-chart';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsSection } from './reports-section';

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

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(11, 16);
}

function pbxLabel(rate: number | null, telephone: number): string {
  if (telephone <= 0) return 'No telephone logs';
  if (rate == null) return 'Not measured';
  return `${Math.round(rate * 100)}% linked to PBX`;
}

function verdictClass(verdict: 'unusable' | 'mixed' | 'usable'): string {
  switch (verdict) {
    case 'unusable':
      return 'border-red-200 bg-red-50 text-red-950';
    case 'mixed':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'usable':
      return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

function ClusterRow({
  cluster,
  from,
  to,
  showUserLink,
}: {
  cluster: ActivityIntelligenceCluster;
  from: string;
  to: string;
  showUserLink: boolean;
}) {
  const params = new URLSearchParams({ from, to });
  if (showUserLink && cluster.ownerClerkUserId) {
    params.set('userUid', cluster.ownerClerkUserId);
  }
  params.set('q', cluster.place);

  return (
    <TableRow>
      <TableCell className="max-w-[220px]">
        <Link
          href={`/visits?${params.toString()}`}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {cluster.place}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {cluster.ownerName ?? 'Unknown owner'}
        </p>
      </TableCell>
      <TableCell className="tabular-nums">{cluster.count}</TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {formatClock(cluster.windowStart)}–{formatClock(cluster.windowEnd)}
        <span className="block text-muted-foreground">{cluster.windowMinutes} min</span>
      </TableCell>
      <TableCell className="tabular-nums">~{cluster.avgSeconds}s</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {cluster.flags.map((flag) => (
            <Badge key={flag} variant="outline" className="text-[10px] font-normal">
              {flag.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ReportsInsightsTab() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const client = useApiClient();
  const accessLevel = backendUserData?.accessLevel;
  const scope = getReportsDataScope(accessLevel);
  const isMultiUser = scope !== 'self';
  const selfRef =
    backendUserData?.clerkUserId?.trim() ||
    (backendUserData?.uid != null ? String(backendUserData.uid) : null);

  const { startDate, endDate, from, to, setRange } = useReportsDateRange();
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'activity-intelligence', reportParams],
    queryFn: () => getActivityIntelligence(client, reportParams),
    enabled: isTokenReady,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });

  const completenessBars = useMemo(
    () =>
      data
        ? [
            { name: 'Blank notes', value: data.completeness.blankNotesPct },
            { name: 'No contact', value: data.completeness.missingContactPct },
            { name: 'No follow-up', value: data.completeness.missingFollowUpPct },
          ]
        : [],
    [data]
  );

  const opportunityFunnel = useMemo(
    () =>
      data
        ? [
            { label: 'Connected calls', value: data.funnel.connectedTelephone },
            { label: 'Quality conversations', value: data.funnel.qualityConversations },
            { label: 'Commercial facts', value: data.funnel.commercialFact },
            { label: 'Next steps', value: data.funnel.nextStep },
            { label: 'Quotes', value: data.funnel.withQuote },
            { label: 'Missed pursuits', value: data.funnel.missedOpportunities },
          ]
        : [],
    [data]
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
    return (
      <p className="text-sm text-destructive">Could not load activity intelligence.</p>
    );
  }

  const empty = data.totals.activities === 0;

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
        <SummaryStat
          label="Reliability"
          value={`${data.reliability.score}/100`}
          sub={data.reliability.verdict}
        />
        <SummaryStat
          label="Connected calls"
          value={String(data.funnel.connectedTelephone)}
          sub={`${data.funnel.deadAir} voicemail / no-answer`}
        />
        <SummaryStat
          label="Commercial facts"
          value={String(data.funnel.commercialFact)}
          sub={`${data.funnel.commercialFactPct}% of connected work`}
        />
        <SummaryStat
          label="Next steps"
          value={String(data.funnel.nextStep)}
          sub={`${data.funnel.nextStepPct}% of connected work`}
        />
        <SummaryStat
          label="Quality conversations"
          value={String(data.funnel.qualityConversations)}
          sub={pbxLabel(data.pbxMatchRate, data.telephoneCount)}
        />
        <SummaryStat
          label="Missed pursuits"
          value={String(data.funnel.missedOpportunities)}
          sub={`${data.clusters.length} burst clusters`}
        />
      </div>

      <p className="text-xs text-muted-foreground">{data.reliability.disclaimer}</p>

      {empty ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No CRM activities in this period.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportsChartCard
              title="Reliability score"
              description="How complete and corroborable these records are — not proof of work."
            >
              <div className="flex flex-col items-center gap-3 py-2">
                <CallScoreRadialChart score={data.reliability.score} />
                <Badge
                  variant="outline"
                  className={cn('capitalize', verdictClass(data.reliability.verdict))}
                >
                  {data.reliability.verdict}
                </Badge>
              </div>
            </ReportsChartCard>
            <ReportsChartCard
              title="Completeness gaps"
              description="Share of connected work missing notes, contact, or a next step. Voicemail is not a missing quote."
            >
              <ReportsNamedBarChart
                data={completenessBars}
                fill={REPORTS_CHART_AMBER}
                yAxisLabel="Percent missing"
                heightClassName="h-[240px]"
              />
            </ReportsChartCard>
          </div>

          {data.brief ? (
            <ReportsSection
              title="Summary"
              description="Which conversations created commercial value — volume without a next step is context, not the headline."
            >
              <div className="rounded-lg border border-border/60 bg-card p-4 text-sm leading-relaxed text-foreground">
                {data.brief.summary}
              </div>
              {data.brief.trends.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {data.brief.trends.map((trend) => (
                    <li
                      key={trend.label}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {trend.label}
                        <span className="ml-2 normal-case text-foreground">
                          {trend.direction}
                        </span>
                      </p>
                      <p className="mt-1 text-sm">{trend.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </ReportsSection>
          ) : null}

          <ReportsSection
            title="Opportunity funnel"
            description="Connected conversations to commercial facts and next steps. Dead air is excluded."
          >
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {opportunityFunnel.map((step) => (
                <div
                  key={step.label}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {step.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {step.value}
                  </p>
                </div>
              ))}
            </div>
          </ReportsSection>

          <ReportsSection
            title="Burst clusters"
            description="Packed telephone logs at one place — the Maputo / Klipspruit pattern."
          >
            {data.clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rapid-fire telephone clusters in this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Avg</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clusters.map((cluster) => (
                    <ClusterRow
                      key={`${cluster.ownerClerkUserId ?? 'unknown'}-${cluster.place}-${cluster.windowStart}`}
                      cluster={cluster}
                      from={from}
                      to={to}
                      showUserLink={isMultiUser}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </ReportsSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportsSection title="What this does not prove">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {(data.brief?.dataGaps ?? []).map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </ReportsSection>
            <ReportsSection title="Recommended actions">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {(data.brief?.recommendedActions ?? []).map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </ReportsSection>
          </div>
        </>
      )}
    </div>
  );
}
