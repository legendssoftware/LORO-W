'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, CalendarIcon, User } from 'lucide-react';
import type { SyncProfile } from '@/api/types';
import {
  useBranches,
  useTargetsProgress,
  useUsers,
  getBranchDisplayLabel,
} from '@/api/hooks';
import { isReportsElevatedViewer } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReportsMode } from '@/app/reports/reports-content';
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import {
  userListItemHasPerformanceTarget,
} from '@/app/reports/utils/user-has-performance-target';
import type { TargetsProgressBucketRow } from '@/api/types/targets-progress';
import { ReportsActivityByDayChart } from '@/app/reports/components/reports-activity-by-day-chart';
import { ReportsCurrentProgressTable } from '@/app/reports/components/reports-current-progress-table';
import { userBehindForSelectedRange } from '@/app/reports/utils/targets-progress-display';

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

/** Fixed daily pace benchmark per reporting user (overview scope line; hourly view uses ÷24). */
const SCOPE_TARGET_PER_USER_PER_DAY = 60;

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function utcToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function getUtcMonthRange(ref: Date): { from: string; to: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m, lastDay));
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

type OverviewTimeframe = 'day' | 'month';

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

const callsChartConfig = {
  achievedCalls: {
    label: 'Achieved calls',
    color: REPORT_CHART_HSL.c5,
  },
  targetCalls: {
    label: 'Target (prorated)',
    color: REPORT_CHART_HSL.c2,
  },
} satisfies ChartConfig;

const scopeTargetLegend = {
  label: 'Scope benchmark',
  color: REPORT_CHART_HSL.c1,
} as const;

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
  metric: 'leads' | 'visits' | 'calls';
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row || typeof row !== 'object') return null;

  const aKey =
    metric === 'leads'
      ? 'achievedLeads'
      : metric === 'visits'
        ? 'achievedVisits'
        : 'achievedCalls';
  const tKey =
    metric === 'leads'
      ? 'targetLeads'
      : metric === 'visits'
        ? 'targetVisits'
        : 'targetCalls';
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
  const [timeframe, setTimeframe] = React.useState<OverviewTimeframe>('month');
  const [dayPopoverOpen, setDayPopoverOpen] = React.useState(false);
  const [monthPopoverOpen, setMonthPopoverOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => utcToday());
  const [monthAnchor, setMonthAnchor] = React.useState<Date>(() => utcToday());
  const [selectedBranchId, setSelectedBranchId] =
    React.useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] =
    React.useState<string>('all');
  const [onlyBehind, setOnlyBehind] = React.useState(false);

  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const filterSuffix = React.useMemo(
    () => ({
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(elevated && selectedOwnerUid !== 'all'
        ? { userUid: Number(selectedOwnerUid) }
        : {}),
    }),
    [elevated, selectedBranchId, selectedOwnerUid]
  );

  const progressParams = React.useMemo(() => {
    if (timeframe === 'day') {
      const d = formatUtcYmd(selectedDay);
      return {
        from: d,
        to: d,
        bucket: 'hour' as const,
        ...filterSuffix,
      };
    }
    const { from, to } = getUtcMonthRange(monthAnchor);
    return {
      from,
      to,
      bucket: 'day' as const,
      ...filterSuffix,
    };
  }, [timeframe, selectedDay, monthAnchor, filterSuffix]);

  const activityProgressParams = React.useMemo(() => {
    if (timeframe === 'day') {
      const d = formatUtcYmd(selectedDay);
      return {
        from: d,
        to: d,
        bucket: 'day' as const,
        ...filterSuffix,
      };
    }
    const { from, to } = getUtcMonthRange(monthAnchor);
    return {
      from,
      to,
      bucket: 'day' as const,
      ...filterSuffix,
    };
  }, [timeframe, selectedDay, monthAnchor, filterSuffix]);

  const activityDateFrom = activityProgressParams.from;
  const activityDateTo = activityProgressParams.to;

  const {
    data: progressData,
    isLoading,
    isError,
    error,
  } = useTargetsProgress(progressParams, {
    enabled: Boolean(progressParams.from && progressParams.to),
  });

  const {
    data: activityProgressData,
    isLoading: activityLoading,
    isError: activityIsError,
    error: activityError,
  } = useTargetsProgress(activityProgressParams, {
    enabled: Boolean(activityProgressParams.from && activityProgressParams.to),
  });

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
      elevated ? usersList.filter(userListItemHasPerformanceTarget) : usersList,
    [elevated, usersList]
  );

  React.useEffect(() => {
    if (!elevated || selectedOwnerUid === 'all') return;
    const ok = reportingUsers.some((u) => String(u.uid) === selectedOwnerUid);
    if (!ok) setSelectedOwnerUid('all');
  }, [elevated, reportingUsers, selectedOwnerUid]);

  React.useEffect(() => {
    if (!elevated) setOnlyBehind(false);
  }, [elevated]);

  const activityUsersWithTargets = React.useMemo(
    () => (activityProgressData?.users ?? []).filter((u) => u.hasTarget),
    [activityProgressData?.users]
  );

  const activityBehindCount = React.useMemo(
    () => activityUsersWithTargets.filter(userBehindForSelectedRange).length,
    [activityUsersWithTargets]
  );

  const chartData = React.useMemo(
    () =>
      bucketRowsToChartData(
        progressData?.aggregateBuckets ?? [],
        timeframe
      ),
    [progressData?.aggregateBuckets, timeframe]
  );

  const scopedHeadcount = React.useMemo(
    () =>
      !elevated
        ? 1
        : selectedOwnerUid !== 'all'
          ? 1
          : reportingUsers.length,
    [elevated, selectedOwnerUid, reportingUsers]
  );

  const scopedLineY = React.useMemo(
    () =>
      (SCOPE_TARGET_PER_USER_PER_DAY * scopedHeadcount) /
      (timeframe === 'day' ? 24 : 1),
    [scopedHeadcount, timeframe]
  );

  const scopeCardNote =
    timeframe === 'day'
      ? `Scope line: ${SCOPE_TARGET_PER_USER_PER_DAY * scopedHeadcount}/day ÷ 24 h (60 × ${scopedHeadcount} user${scopedHeadcount === 1 ? '' : 's'}).`
      : `Scope line: ${SCOPE_TARGET_PER_USER_PER_DAY * scopedHeadcount}/day (60 × ${scopedHeadcount} user${scopedHeadcount === 1 ? '' : 's'}).`;

  const leadsYMax = React.useMemo(() => {
    let max = scopedLineY;
    for (const row of chartData) {
      max = Math.max(
        max,
        Number(row.achievedLeads ?? 0),
        Number(row.targetLeads ?? 0)
      );
    }
    return Math.max(Math.ceil(max * 1.12), 1);
  }, [chartData, scopedLineY]);

  const visitsYMax = React.useMemo(() => {
    let max = scopedLineY;
    for (const row of chartData) {
      max = Math.max(
        max,
        Number(row.achievedVisits ?? 0),
        Number(row.targetVisits ?? 0)
      );
    }
    return Math.max(Math.ceil(max * 1.12), 1);
  }, [chartData, scopedLineY]);

  const callsYMax = React.useMemo(() => {
    let max = scopedLineY;
    for (const row of chartData) {
      max = Math.max(
        max,
        Number(row.achievedCalls ?? 0),
        Number(row.targetCalls ?? 0)
      );
    }
    return Math.max(Math.ceil(max * 1.12), 1);
  }, [chartData, scopedLineY]);

  const leadsChartConfigMerged = {
    ...leadsChartConfig,
    scopeTarget: {
      label: scopeTargetLegend.label,
      color: scopeTargetLegend.color,
    },
  } satisfies ChartConfig;

  const visitsChartConfigMerged = {
    ...visitsChartConfig,
    scopeTarget: {
      label: scopeTargetLegend.label,
      color: scopeTargetLegend.color,
    },
  } satisfies ChartConfig;

  const callsChartConfigMerged = {
    ...callsChartConfig,
    scopeTarget: {
      label: scopeTargetLegend.label,
      color: scopeTargetLegend.color,
    },
  } satisfies ChartConfig;

  const rangeDescription =
    timeframe === 'day'
      ? `${formatUtcYmd(selectedDay)} (UTC, hourly)`
      : `${getUtcMonthRange(monthAnchor).from} – ${getUtcMonthRange(monthAnchor).to} (UTC, daily)`;

  const totals = React.useMemo(() => {
    const rows = progressData?.aggregateBuckets ?? [];
    return rows.reduce(
      (acc, b) => ({
        leadsA: acc.leadsA + b.achievedLeads,
        leadsT: acc.leadsT + b.targetLeads,
        visA: acc.visA + b.achievedVisits,
        visT: acc.visT + b.targetVisits,
        callsA: acc.callsA + b.achievedCalls,
        callsT: acc.callsT + b.targetCalls,
      }),
      { leadsA: 0, leadsT: 0, visA: 0, visT: 0, callsA: 0, callsT: 0 }
    );
  }, [progressData?.aggregateBuckets]);

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

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <Select
            value={timeframe}
            onValueChange={(v) => setTimeframe(v as OverviewTimeframe)}
          >
            <SelectTrigger
              className={cn(selectTriggerClass, 'sm:min-w-[200px] sm:w-[200px]')}
            >
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Single day (hourly)</SelectItem>
              <SelectItem value="month">Month (daily)</SelectItem>
            </SelectContent>
          </Select>

          {timeframe === 'day' ? (
            <Popover open={dayPopoverOpen} onOpenChange={setDayPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-9 w-full justify-start text-left font-normal sm:w-[220px]',
                    selectTriggerClass
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  {formatUtcYmd(selectedDay)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => {
                    if (d)
                      setSelectedDay(
                        new Date(
                          Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
                        )
                      );
                  }}
                  initialFocus
                />
                <div className="flex flex-wrap justify-end gap-2 border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDay(utcToday())}
                  >
                    Today (UTC)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDayPopoverOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-9 w-full justify-start text-left font-normal sm:w-[240px]',
                    selectTriggerClass
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  {format(monthAnchor, 'MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={monthAnchor}
                  onSelect={(d) => {
                    if (d)
                      setMonthAnchor(
                        new Date(
                          Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
                        )
                      );
                  }}
                  initialFocus
                />
                <div className="flex flex-wrap justify-end gap-2 border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMonthAnchor(utcToday())}
                  >
                    This month (UTC)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMonthPopoverOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {elevated ? (
          <>
            <Select
              value={selectedBranchId}
              onValueChange={(v) => {
                setSelectedBranchId(v);
                setSelectedOwnerUid('all');
              }}
            >
              <SelectTrigger
                className={cn(selectTriggerClass, 'sm:min-w-[200px] sm:w-[200px]')}
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.uid} value={String(b.uid)}>
                    {getBranchDisplayLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedOwnerUid} onValueChange={setSelectedOwnerUid}>
              <SelectTrigger
                className={cn(selectTriggerClass, 'sm:min-w-[220px] sm:w-[220px]')}
              >
                <User className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {reportingUsers.map((u) => (
                  <SelectItem key={u.uid} value={String(u.uid)}>
                    {[u.name, u.surname].filter(Boolean).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        {activityLoading ? (
          <LoadingSpinner wrapperClassName="py-10" />
        ) : activityIsError ? (
          <p className="text-center text-destructive py-6">
            {(activityError as Error)?.message ??
              'Failed to load activity progress'}
          </p>
        ) : (
          <>
            <ReportsActivityByDayChart
              aggregateBuckets={activityProgressData?.aggregateBuckets}
              dateFrom={activityDateFrom}
              dateTo={activityDateTo}
              elevated={elevated}
              usersInScopeCount={activityUsersWithTargets.length}
              behindCount={activityBehindCount}
            />
            <ReportsCurrentProgressTable
              usersWithTargets={activityUsersWithTargets}
              dateFrom={activityDateFrom}
              dateTo={activityDateTo}
              elevated={elevated}
              onlyBehind={onlyBehind}
              onOnlyBehindChange={setOnlyBehind}
              isLoading={false}
              isError={false}
              error={null}
            />
          </>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : isError ? (
        <p className="text-center text-destructive py-8">
          {(error as Error)?.message ?? 'Failed to load trend data'}
        </p>
      ) : chartData.length === 0 ? (
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
                {totals.leadsT.toLocaleString()} target. {scopeCardNote}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pr-2">
              <ChartContainer
                config={leadsChartConfigMerged}
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
                    allowDecimals={timeframe === 'day'}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[0, leadsYMax]}
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
                  {scopedLineY > 0 ? (
                    <ReferenceLine
                      y={scopedLineY}
                      stroke="var(--color-scopeTarget)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                </AreaChart>
              </ChartContainer>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 px-2 text-xs sm:px-4">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm"
                  style={{ background: scopeTargetLegend.color }}
                  aria-hidden
                />
                <span>{scopeTargetLegend.label}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm min-w-0">
            <CardHeader>
              <CardTitle>Visits trend</CardTitle>
              <CardDescription>
                Achieved visits (physical check-ins) vs prorated target —{' '}
                {rangeDescription}. Range totals: {totals.visA.toLocaleString()}{' '}
                achieved / {totals.visT.toLocaleString()} target. {scopeCardNote}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pr-2">
              <ChartContainer
                config={visitsChartConfigMerged}
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
                    allowDecimals={timeframe === 'day'}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[0, visitsYMax]}
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
                  {scopedLineY > 0 ? (
                    <ReferenceLine
                      y={scopedLineY}
                      stroke="var(--color-scopeTarget)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                </AreaChart>
              </ChartContainer>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 px-2 text-xs sm:px-4">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm"
                  style={{ background: scopeTargetLegend.color }}
                  aria-hidden
                />
                <span>{scopeTargetLegend.label}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm min-w-0">
            <CardHeader>
              <CardTitle>Calls trend</CardTitle>
              <CardDescription>
                Achieved calls (non-physical check-ins, e.g. telephone) vs
                prorated target — {rangeDescription}. Range totals:{' '}
                {totals.callsA.toLocaleString()} achieved /{' '}
                {totals.callsT.toLocaleString()} target. {scopeCardNote}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pr-2">
              <ChartContainer
                config={callsChartConfigMerged}
                className="aspect-auto h-[340px] w-full min-w-0"
              >
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ ...trendAxis.chartMargin }}
                >
                  <defs>
                    <linearGradient
                      id="fillAchievedCallsOverview"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-achievedCalls)"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-achievedCalls)"
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
                    allowDecimals={timeframe === 'day'}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[0, callsYMax]}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => (
                      <OverviewTooltipBody
                        active={active}
                        payload={payload as TooltipPayloadItem[]}
                        metric="calls"
                      />
                    )}
                  />
                  <ChartLegend
                    verticalAlign="top"
                    content={<ChartLegendContent className="flex-wrap" />}
                  />
                  <Area
                    name={callsChartConfig.achievedCalls.label}
                    dataKey="achievedCalls"
                    type="natural"
                    fill="url(#fillAchievedCallsOverview)"
                    stroke="var(--color-achievedCalls)"
                  />
                  <Line
                    name={callsChartConfig.targetCalls.label}
                    type="monotone"
                    dataKey="targetCalls"
                    stroke="var(--color-targetCalls)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  {scopedLineY > 0 ? (
                    <ReferenceLine
                      y={scopedLineY}
                      stroke="var(--color-scopeTarget)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                </AreaChart>
              </ChartContainer>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 px-2 text-xs sm:px-4">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm"
                  style={{ background: scopeTargetLegend.color }}
                  aria-hidden
                />
                <span>{scopeTargetLegend.label}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
