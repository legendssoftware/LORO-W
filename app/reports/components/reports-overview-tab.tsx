'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
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

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

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
  const [timeframe, setTimeframe] = React.useState<OverviewTimeframe>('month');
  const [dayPopoverOpen, setDayPopoverOpen] = React.useState(false);
  const [monthPopoverOpen, setMonthPopoverOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => utcToday());
  const [monthAnchor, setMonthAnchor] = React.useState<Date>(() => utcToday());
  const [selectedBranchId, setSelectedBranchId] =
    React.useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] =
    React.useState<string>('all');

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

  const {
    data: progressData,
    isLoading,
    isError,
    error,
  } = useTargetsProgress(progressParams, {
    enabled: Boolean(progressParams.from && progressParams.to),
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

  const chartData = React.useMemo(
    () =>
      bucketRowsToChartData(
        progressData?.aggregateBuckets ?? [],
        timeframe
      ),
    [progressData?.aggregateBuckets, timeframe]
  );

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
      }),
      { leadsA: 0, leadsT: 0, visA: 0, visT: 0 }
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
                Achieved visits (physical check-ins) vs prorated target —{' '}
                {rangeDescription}. Range totals: {totals.visA.toLocaleString()}{' '}
                achieved / {totals.visT.toLocaleString()} target.
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
  );
}
