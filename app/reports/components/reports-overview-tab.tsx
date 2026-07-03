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
import { useBranches, useTargetsProgress, useUsers } from '@/api/hooks';
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
import type { ReportsMode } from '@/app/reports/reports-mode';
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import {
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';
import type { TargetsProgressBucketRow } from '@/api/types/targets-progress';
import { ReportsOverviewFiltersBar } from '@/app/reports/components/reports-overview-filters-bar';
import {
  formatUtcYmd,
  utcMonthStartThroughToday,
  type OverviewTimeframe,
} from '@/app/reports/utils/overview-daily-summary';

/** Same switch as `NODE_ENV` in `.env.local` (e.g. `NODE_ENV=development`) — dev-only Overview trend logs. */
const REPORTS_OVERVIEW_DEBUG_LOGS = process.env.NODE_ENV === 'development';

function achievedVisitsFromProgressBucket(b: TargetsProgressBucketRow): number {
  if (typeof b.achievedCheckInsAllTypes === 'number') {
    return b.achievedCheckInsAllTypes;
  }
  return (b.achievedCalls ?? 0) + (b.achievedVisits ?? 0);
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
    achievedVisits: achievedVisitsFromProgressBucket(b),
    targetVisits: b.targetVisits,
    combinedTarget: b.targetVisits + b.targetLeads,
    achievedCalls: b.achievedCalls,
    targetCalls: b.targetCalls,
  }));
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

const activityChartConfig = {
  achievedVisits: {
    label: 'Achieved visits',
    color: REPORT_CHART_HSL.c4,
  },
  achievedLeads: {
    label: 'Achieved leads',
    color: REPORT_CHART_HSL.c3,
  },
  combinedTarget: {
    label: 'Target (prorated)',
    color: REPORT_CHART_HSL.c5,
  },
} satisfies ChartConfig;

type TooltipPayloadItem = {
  dataKey?: string;
  value?: number;
  name?: string;
  payload?: Record<string, string | number>;
};

function ActivityTooltipBody({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row || typeof row !== 'object') return null;

  const visits = Number(row.achievedVisits ?? 0);
  const leads = Number(row.achievedLeads ?? 0);
  const target = Number(row.combinedTarget ?? 0);
  const combinedAchieved = visits + leads;
  const { delta, pct } = variationLine(combinedAchieved, target);
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

  const {
    data: progressData,
    isLoading,
    isError,
    error,
  } = useTargetsProgress(progressParams, {
    enabled: Boolean(progressParams.from && progressParams.to),
  });

  const chartData = React.useMemo(
    () => bucketRowsToChartData(progressData?.aggregateBuckets ?? [], timeframe),
    [progressData?.aggregateBuckets, timeframe]
  );

  const rangeDescription =
    timeframe === 'day'
      ? `${fromYmd} (UTC, hourly)`
      : `${fromYmd} – ${toYmd} (UTC, daily)`;

  const totals = React.useMemo(() => {
    const rows = progressData?.aggregateBuckets ?? [];
    const { leadsA, leadsT, visA, visT } = rows.reduce(
      (acc, b) => ({
        leadsA: acc.leadsA + b.achievedLeads,
        leadsT: acc.leadsT + b.targetLeads,
        visA: acc.visA + achievedVisitsFromProgressBucket(b),
        visT: acc.visT + b.targetVisits,
      }),
      { leadsA: 0, leadsT: 0, visA: 0, visT: 0 }
    );
    return { leadsA, leadsT, visA, visT, combinedT: visT + leadsT };
  }, [progressData?.aggregateBuckets]);

  const activityYMax = React.useMemo(() => {
    let max = 0;
    for (const row of chartData) {
      max = Math.max(
        max,
        row.achievedVisits,
        row.achievedLeads,
        row.combinedTarget
      );
    }
    return Math.max(Math.ceil(max * 1.12), 1);
  }, [chartData]);

  React.useEffect(() => {
    if (!REPORTS_OVERVIEW_DEBUG_LOGS) return;
    const buckets = progressData?.aggregateBuckets ?? [];
    const bucketAchievedLeadsSum = buckets.reduce(
      (s, b) => s + b.achievedLeads,
      0
    );
    const trendInputs = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      window: { startDate: b.startDate, endDate: b.endDate },
      activityTrendInput: {
        achievedLeads: b.achievedLeads,
        targetLeads: b.targetLeads,
        targetVisits: b.targetVisits,
        achievedCheckInsAllTypes: achievedVisitsFromProgressBucket(b),
        combinedTarget: b.targetVisits + b.targetLeads,
      },
    }));
    console.debug('[reports/overview] trend mapping — source rows (targets-progress API)', {
      trendInputs,
    });
    const activityTrend = chartData.map((row) => ({
      xTick: row.xTick,
      achievedVisits: row.achievedVisits,
      achievedLeads: row.achievedLeads,
      combinedTarget: row.combinedTarget,
    }));
    console.debug('[reports/overview] trend chart — mapped series (Total activity)', {
      activityTrend,
      chartDataFull: chartData,
    });
    console.debug('[reports/overview]', {
      nodeEnv: process.env.NODE_ENV,
      broughtInLeadsTotal: totals.leadsA,
      bucketAchievedLeadsSum,
      mappedVisitsTotal: totals.visA,
      combinedTargetTotal: totals.combinedT,
      range: rangeDescription,
      timeframe,
      reportsMode,
      progressFromTo: { from: progressParams.from, to: progressParams.to },
      branchId: elevated ? selectedBranchId : undefined,
      ownerUid: elevated ? resolvedOwnerUid : undefined,
      chartBucketCount: chartData.length,
    });
  }, [
    totals.leadsA,
    totals.visA,
    totals.combinedT,
    rangeDescription,
    timeframe,
    reportsMode,
    progressParams.from,
    progressParams.to,
    elevated,
    selectedBranchId,
    resolvedOwnerUid,
    chartData,
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

  const chartsLoading = isLoading;
  const chartsError = isError;
  const chartsErrorMessage =
    (error as Error | undefined)?.message ?? 'Failed to load trend data';

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
          <Card className="border border-border bg-background shadow-sm min-w-0">
            <CardHeader>
              <CardTitle>Total activity</CardTitle>
              <CardDescription>
                Achieved visits and leads vs combined prorated target —{' '}
                {rangeDescription}. Range totals:{' '}
                {totals.visA.toLocaleString()} visits,{' '}
                {totals.leadsA.toLocaleString()} leads /{' '}
                {totals.combinedT.toLocaleString()} target.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pr-2">
              <ChartContainer
                config={activityChartConfig}
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
                    domain={[0, activityYMax]}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => (
                      <ActivityTooltipBody
                        active={active}
                        payload={payload as TooltipPayloadItem[]}
                      />
                    )}
                  />
                  <ChartLegend
                    verticalAlign="top"
                    content={<ChartLegendContent className="flex-wrap" />}
                  />
                  <Area
                    name={activityChartConfig.achievedVisits.label}
                    dataKey="achievedVisits"
                    type="natural"
                    fill="url(#fillAchievedVisits)"
                    stroke="var(--color-achievedVisits)"
                  />
                  <Area
                    name={activityChartConfig.achievedLeads.label}
                    dataKey="achievedLeads"
                    type="natural"
                    fill="url(#fillAchievedLeads)"
                    stroke="var(--color-achievedLeads)"
                  />
                  <Line
                    name={activityChartConfig.combinedTarget.label}
                    type="monotone"
                    dataKey="combinedTarget"
                    stroke="var(--color-combinedTarget)"
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
