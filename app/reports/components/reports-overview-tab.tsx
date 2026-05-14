'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import type { SyncProfile } from '@/api/types';
import type { VisitListItem } from '@/api/types/visits';
import {
  useBranches,
  useCheckIns,
  useTargetsProgress,
  useUsers,
} from '@/api/hooks';
import { isReportsElevatedViewer } from '@/lib/access';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { ReportsMode } from '@/app/reports/reports-content';
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import {
  buildReportingUserUidSet,
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';
import type { TargetsProgressBucketRow } from '@/api/types/targets-progress';
import { ReportsOverviewFiltersBar } from '@/app/reports/components/reports-overview-filters-bar';
import {
  formatUtcYmd,
  utcMonthStartThroughToday,
  type OverviewTimeframe,
} from '@/app/reports/utils/overview-daily-summary';
import { countCheckInsInProgressBucket } from '@/app/reports/utils/targets-progress-bucket-utc';

/** Same switch as `NODE_ENV` in `.env.local` (e.g. `NODE_ENV=development`) — dev-only Overview trend logs. */
const REPORTS_OVERVIEW_DEBUG_LOGS = process.env.NODE_ENV === 'development';

function filterVisitListItemsByOwnerUids(
  checkIns: VisitListItem[],
  allowedUids: Set<number>,
  apply: boolean
): VisitListItem[] {
  if (!apply) return checkIns;
  return checkIns.filter((c) => {
    const uid = c.owner?.uid;
    if (uid == null) return false;
    return allowedUids.has(uid);
  });
}

function formatDailyXTick(key: string): string {
  const datePart = key.includes('T') ? key.slice(0, 10) : key.slice(0, 10);
  const d = new Date(`${datePart}T12:00:00.000Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatHourlyXTick(key: string): string {
  const m = key.match(/T(\d{2})$/);
  if (m) return `${m[1]}:00`;
  return key;
}

function bucketRowsToChartData(
  rows: TargetsProgressBucketRow[],
  timeframe: OverviewTimeframe
) {
  return rows.map((b) => ({
    xTick: timeframe === 'day' ? formatHourlyXTick(b.key) : formatDailyXTick(b.key),
    tooltipTitle:
      timeframe === 'month'
        ? formatDailyXTick(b.key)
        : `${formatDailyXTick(b.key)} · ${formatHourlyXTick(b.key)}`,
    label: b.label.length > 12 ? b.key : b.label,
    fullLabel: b.label,
    achievedLeads: b.achievedLeads,
    targetLeads: b.targetLeads,
    achievedVisits: b.achievedVisits,
    targetVisits: b.targetVisits,
    achievedCalls: b.achievedCalls,
    targetCalls: b.targetCalls,
  }));
}

function mergeChartRowsWithCheckInVisits(
  rows: TargetsProgressBucketRow[],
  checkIns: VisitListItem[],
  timeframe: OverviewTimeframe
) {
  const base = bucketRowsToChartData(rows, timeframe);
  return base.map((row, i) => {
    const b = rows[i];
    if (!b) return row;
    return {
      ...row,
      achievedVisits: countCheckInsInProgressBucket(
        checkIns,
        b.key,
        timeframe
      ),
    };
  });
}

function variationLine(
  achieved: number,
  target: number
): { delta: number; pct: string | null } {
  const delta = achieved - target;
  let pct: string | null = null;
  if (target > 0) {
    pct = `${Math.round((achieved / target) * 100)}%`;
  }
  return { delta, pct };
}

const leadsChartConfig = {
  achievedLeads: {
    label: 'Achieved leads',
    color: REPORT_CHART_HSL.c3,
  },
  targetLeads: {
    label: 'Target (prorated)',
    color: REPORT_CHART_HSL.c5,
  },
} satisfies ChartConfig;

const visitsChartConfig = {
  achievedVisits: {
    label: 'Achieved visits',
    color: REPORT_CHART_HSL.c4,
  },
  targetVisits: {
    label: 'Target (prorated)',
    color: REPORT_CHART_HSL.c2,
  },
} satisfies ChartConfig;

type TooltipPayloadItem = {
  dataKey?: string;
  value?: number;
  name?: string;
  payload?: Record<string, string | number>;
};

function OverviewTooltipBody({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  metric: 'leads' | 'visits';
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row || typeof row !== 'object') return null;

  const aKey = metric === 'leads' ? 'achievedLeads' : 'achievedVisits';
  const tKey = metric === 'leads' ? 'targetLeads' : 'targetVisits';
  const achieved = Number(row[aKey] ?? 0);
  const target = Number(row[tKey] ?? 0);
  const { delta, pct } = variationLine(achieved, target);
  const title =
    typeof row.tooltipTitle === 'string' && row.tooltipTitle
      ? row.tooltipTitle
      : typeof row.fullLabel === 'string'
        ? row.fullLabel
        : typeof row.label === 'string'
          ? row.label
          : '';

  return (
    <div className="border-border/50 bg-background grid min-w-[10rem] gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{title}</div>
      {payload
        .filter((p) => p.value != null && p.dataKey)
        .map((p) => (
          <div
            key={String(p.dataKey)}
            className="flex justify-between gap-4 font-mono tabular-nums"
          >
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-medium">{Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      <div className="text-muted-foreground border-t border-border/60 pt-1.5">
        Variation: {delta >= 0 ? '+' : ''}
        {delta}
        {pct != null ? ` (${pct} of target)` : ''}
      </div>
    </div>
  );
}

export interface ReportsOverviewTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsOverviewTab({
  profile,
  reportsMode,
}: ReportsOverviewTabProps) {
  const [rangeStart, setRangeStart] = React.useState<Date>(() => {
    const { start } = utcMonthStartThroughToday();
    return start;
  });
  const [rangeEnd, setRangeEnd] = React.useState<Date>(() => {
    const { end } = utcMonthStartThroughToday();
    return end;
  });
  const [rangePopoverOpen, setRangePopoverOpen] = React.useState(false);
  const [selectedBranchId, setSelectedBranchId] =
    React.useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] =
    React.useState<string>('all');

  const fromYmd = formatUtcYmd(rangeStart);
  const toYmd = formatUtcYmd(rangeEnd);
  const timeframe: OverviewTimeframe =
    fromYmd === toYmd ? 'day' : 'month';

  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({
    enabled: elevated,
    limit: 250,
    ...(selectedBranchId !== 'all'
      ? { branchId: Number(selectedBranchId) }
      : {}),
  });

  const reportingUsers = React.useMemo(
    () =>
      elevated ? usersList.filter(userListItemInLeadsVisitsReportingCohort) : usersList,
    [elevated, usersList]
  );

  const reportingUidSet = React.useMemo(
    () => buildReportingUserUidSet(reportingUsers),
    [reportingUsers]
  );

  /** Coerce invalid org user selection (e.g. after branch change) without setState in an effect. */
  const resolvedOwnerUid = React.useMemo(() => {
    if (!elevated || selectedOwnerUid === 'all') return selectedOwnerUid;
    return reportingUsers.some((u) => String(u.uid) === selectedOwnerUid)
      ? selectedOwnerUid
      : 'all';
  }, [elevated, reportingUsers, selectedOwnerUid]);

  const filterSuffix = React.useMemo(
    () => ({
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(elevated && resolvedOwnerUid !== 'all'
        ? { userUid: Number(resolvedOwnerUid) }
        : {}),
    }),
    [elevated, selectedBranchId, resolvedOwnerUid]
  );

  const progressParams = React.useMemo(() => {
    const bucket =
      fromYmd === toYmd ? ('hour' as const) : ('day' as const);
    return {
      from: fromYmd,
      to: toYmd,
      bucket,
      ...filterSuffix,
    };
  }, [fromYmd, toYmd, filterSuffix]);

  const checkInsParams = React.useMemo(() => {
    const startIso = `${fromYmd}T00:00:00.000Z`;
    const endIso = `${toYmd}T23:59:59.999Z`;
    return {
      startDate: startIso,
      endDate: endIso,
      ...(reportsMode === 'self' && profile?.uid != null
        ? { userUid: String(profile.uid) }
        : elevated && resolvedOwnerUid !== 'all'
          ? { userUid: resolvedOwnerUid }
          : {}),
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
    };
  }, [
    fromYmd,
    toYmd,
    reportsMode,
    profile,
    elevated,
    resolvedOwnerUid,
    selectedBranchId,
  ]);

  const checkInsEnabled = Boolean(
    checkInsParams.startDate &&
      checkInsParams.endDate &&
      (reportsMode !== 'self' || profile?.uid != null)
  );

  const {
    data: progressData,
    isLoading,
    isError,
    error,
  } = useTargetsProgress(progressParams, {
    enabled: Boolean(progressParams.from && progressParams.to),
  });

  const {
    data: checkInsData,
    isLoading: checkInsLoading,
    isError: checkInsIsError,
    error: checkInsError,
  } = useCheckIns(checkInsParams, {
    enabled: checkInsEnabled,
  });

  const checkInsForOverviewCharts = React.useMemo(() => {
    const raw = checkInsData?.checkIns ?? [];
    return filterVisitListItemsByOwnerUids(
      raw,
      reportingUidSet,
      elevated && resolvedOwnerUid === 'all'
    );
  }, [
    checkInsData?.checkIns,
    reportingUidSet,
    elevated,
    resolvedOwnerUid,
  ]);

  const chartData = React.useMemo(
    () =>
      mergeChartRowsWithCheckInVisits(
        progressData?.aggregateBuckets ?? [],
        checkInsForOverviewCharts,
        timeframe
      ),
    [progressData?.aggregateBuckets, checkInsForOverviewCharts, timeframe]
  );

  const rangeDescription =
    timeframe === 'day'
      ? `${fromYmd} (UTC, hourly)`
      : `${fromYmd} – ${toYmd} (UTC, daily)`;

  const totals = React.useMemo(() => {
    const rows = progressData?.aggregateBuckets ?? [];
    const checkIns = checkInsForOverviewCharts;
    const visA = rows.reduce(
      (sum, b) =>
        sum + countCheckInsInProgressBucket(checkIns, b.key, timeframe),
      0
    );
    const { leadsA, leadsT, visT } = rows.reduce(
      (acc, b) => ({
        leadsA: acc.leadsA + b.achievedLeads,
        leadsT: acc.leadsT + b.targetLeads,
        visT: acc.visT + b.targetVisits,
      }),
      { leadsA: 0, leadsT: 0, visT: 0 }
    );
    return { leadsA, leadsT, visA, visT };
  }, [progressData?.aggregateBuckets, checkInsForOverviewCharts, timeframe]);

  React.useEffect(() => {
    if (!REPORTS_OVERVIEW_DEBUG_LOGS) return;
    const buckets = progressData?.aggregateBuckets ?? [];
    const checkIns = checkInsForOverviewCharts;
    const bucketAchievedLeadsSum = buckets.reduce(
      (s, b) => s + b.achievedLeads,
      0
    );
    const trendInputs = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      window: { startDate: b.startDate, endDate: b.endDate },
      leadsTrendInput: { achievedLeads: b.achievedLeads, targetLeads: b.targetLeads },
      visitsTrendInput: {
        targetVisits: b.targetVisits,
        achievedVisitsBucketBeforeMerge: b.achievedVisits,
        achievedVisitsFromCheckIns: countCheckInsInProgressBucket(
          checkIns,
          b.key,
          timeframe
        ),
      },
    }));
    console.debug('[reports/overview] trend mapping — source rows (targets API + check-ins per bucket)', {
      trendInputs,
      checkInsForVisitCounts: {
        rowCount: checkIns.length,
        sample: checkIns.slice(0, 5).map((c) => ({
          checkInTime: c.checkInTime,
          ownerUid: c.owner?.uid,
        })),
      },
    });
    const leadsTrend = chartData.map((row) => ({
      xTick: row.xTick,
      achievedLeads: row.achievedLeads,
      targetLeads: row.targetLeads,
    }));
    const visitsTrend = chartData.map((row) => ({
      xTick: row.xTick,
      achievedVisits: row.achievedVisits,
      targetVisits: row.targetVisits,
    }));
    console.debug('[reports/overview] trend charts — mapped series (Leads trend / Visits trend)', {
      leadsTrend,
      visitsTrend,
      chartDataFull: chartData,
    });
    console.debug('[reports/overview]', {
      nodeEnv: process.env.NODE_ENV,
      broughtInLeadsTotal: totals.leadsA,
      bucketAchievedLeadsSum,
      mappedVisitsTotal: totals.visA,
      range: rangeDescription,
      timeframe,
      reportsMode,
      progressFromTo: { from: progressParams.from, to: progressParams.to },
      checkInsRange: {
        startDate: checkInsParams.startDate,
        endDate: checkInsParams.endDate,
      },
      checkInsRowCountUsed: checkInsForOverviewCharts.length,
      branchId: elevated ? selectedBranchId : undefined,
      ownerUid: elevated ? resolvedOwnerUid : undefined,
      chartBucketCount: chartData.length,
    });
  }, [
    totals.leadsA,
    totals.visA,
    rangeDescription,
    timeframe,
    reportsMode,
    progressParams.from,
    progressParams.to,
    checkInsParams.startDate,
    checkInsParams.endDate,
    checkInsForOverviewCharts.length,
    elevated,
    selectedBranchId,
    resolvedOwnerUid,
    chartData,
    checkInsForOverviewCharts,
    progressData?.aggregateBuckets,
  ]);

  const trendAxis = React.useMemo(() => {
    const isMonth = timeframe === 'month';
    return {
      chartMargin: {
        top: 20,
        right: 12,
        left: 4,
        bottom: isMonth ? 58 : 40,
      } as const,
      xAxis: {
        height: isMonth ? 72 : 36,
        angle: isMonth ? -28 : 0,
        textAnchor: (isMonth ? 'end' : 'middle') as 'end' | 'middle',
        minTickGap: isMonth ? 28 : 6,
        interval: isMonth ? undefined : 2,
      },
    };
  }, [timeframe]);

  const chartsLoading = isLoading || (checkInsEnabled && checkInsLoading);
  const chartsError = isError || (checkInsEnabled && checkInsIsError);
  const chartsErrorMessage =
    (error as Error | undefined)?.message ??
    (checkInsError as Error | undefined)?.message ??
    'Failed to load trend data';

  return (
    <div className="flex flex-col gap-6 pb-8">
      <ReportsOverviewFiltersBar
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        rangePopoverOpen={rangePopoverOpen}
        onRangePopoverOpenChange={setRangePopoverOpen}
        onRangeChange={({ start, end }) => {
          setRangeStart(start);
          setRangeEnd(end);
        }}
        elevated={elevated}
        branches={branches}
        reportingUsers={reportingUsers}
        selectedBranchId={selectedBranchId}
        onBranchChange={(v) => {
          setSelectedBranchId(v);
          setSelectedOwnerUid('all');
        }}
        selectedOwnerUid={resolvedOwnerUid}
        onOwnerChange={setSelectedOwnerUid}
      />

      {chartsLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : chartsError ? (
        <p className="text-center text-destructive py-8">{chartsErrorMessage}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              No data for this selection.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-1">
          <Card className="border border-gray-200 bg-white shadow-sm min-w-0">
            <CardHeader>
              <CardTitle>Leads trend</CardTitle>
              <CardDescription>
                Achieved leads vs prorated target — {rangeDescription}. Range
                totals: {totals.leadsA.toLocaleString()} achieved /{' '}
                {totals.leadsT.toLocaleString()} target.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pr-2">
              <ChartContainer
                config={leadsChartConfig}
                className="aspect-auto h-[340px] w-full min-w-0"
              >
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ ...trendAxis.chartMargin }}
                >
                  <defs>
                    <linearGradient
                      id="fillAchievedLeads"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-achievedLeads)"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-achievedLeads)"
                        stopOpacity={0.12}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="xTick"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={trendAxis.xAxis.minTickGap}
                    angle={trendAxis.xAxis.angle}
                    textAnchor={trendAxis.xAxis.textAnchor}
                    height={trendAxis.xAxis.height}
                    interval={trendAxis.xAxis.interval}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[
                      0,
                      (max: number) =>
                        Number.isFinite(max)
                          ? Math.max(Math.ceil(max * 1.12), 1)
                          : 1,
                    ]}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => (
                      <OverviewTooltipBody
                        active={active}
                        payload={payload as TooltipPayloadItem[]}
                        metric="leads"
                      />
                    )}
                  />
                  <ChartLegend
                    verticalAlign="top"
                    content={<ChartLegendContent className="flex-wrap" />}
                  />
                  <Area
                    name={leadsChartConfig.achievedLeads.label}
                    dataKey="achievedLeads"
                    type="natural"
                    fill="url(#fillAchievedLeads)"
                    stroke="var(--color-achievedLeads)"
                  />
                  <Line
                    name={leadsChartConfig.targetLeads.label}
                    type="monotone"
                    dataKey="targetLeads"
                    stroke="var(--color-targetLeads)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm min-w-0">
            <CardHeader>
              <CardTitle>Visits trend</CardTitle>
              <CardDescription>
                Achieved visits (all types, same as Visits tab / check-ins API) vs
                prorated target — {rangeDescription}. Range totals:{' '}
                {totals.visA.toLocaleString()} achieved /{' '}
                {totals.visT.toLocaleString()} target.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pr-2">
              <ChartContainer
                config={visitsChartConfig}
                className="aspect-auto h-[340px] w-full min-w-0"
              >
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ ...trendAxis.chartMargin }}
                >
                  <defs>
                    <linearGradient
                      id="fillAchievedVisits"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-achievedVisits)"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-achievedVisits)"
                        stopOpacity={0.12}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="xTick"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={trendAxis.xAxis.minTickGap}
                    angle={trendAxis.xAxis.angle}
                    textAnchor={trendAxis.xAxis.textAnchor}
                    height={trendAxis.xAxis.height}
                    interval={trendAxis.xAxis.interval}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[
                      0,
                      (max: number) =>
                        Number.isFinite(max)
                          ? Math.max(Math.ceil(max * 1.12), 1)
                          : 1,
                    ]}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => (
                      <OverviewTooltipBody
                        active={active}
                        payload={payload as TooltipPayloadItem[]}
                        metric="visits"
                      />
                    )}
                  />
                  <ChartLegend
                    verticalAlign="top"
                    content={<ChartLegendContent className="flex-wrap" />}
                  />
                  <Area
                    name={visitsChartConfig.achievedVisits.label}
                    dataKey="achievedVisits"
                    type="natural"
                    fill="url(#fillAchievedVisits)"
                    stroke="var(--color-achievedVisits)"
                  />
                  <Line
                    name={visitsChartConfig.targetVisits.label}
                    type="monotone"
                    dataKey="targetVisits"
                    stroke="var(--color-targetVisits)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
