'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, startOfDay } from 'date-fns';
import {
  AlertTriangle,
  Building2,
  CalendarIcon,
  CalendarRange,
  Target,
  User,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { SyncProfile } from '@/api/types';
import type { TargetsProgressUserSummary } from '@/api/types/targets-progress';
import {
  useBranches,
  useTargetsProgress,
  useUsers,
  getBranchDisplayLabel,
} from '@/api/hooks';
import { isReportsElevatedViewer } from '@/lib/access';
import { exportToCsv } from '@/lib/utils/report-export';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReportsMode } from '@/app/reports/reports-content';
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import {
  userListItemHasPerformanceTarget,
} from '@/app/reports/utils/user-has-performance-target';
import {
  ReportDonutChart,
  type ReportDonutSlice,
} from '@/components/charts/report-donut-chart';

const DONUT_COLORS = [
  REPORT_CHART_HSL.c1,
  REPORT_CHART_HSL.c2,
  REPORT_CHART_HSL.c3,
  REPORT_CHART_HSL.c4,
  REPORT_CHART_HSL.c5,
] as const;

function mergeBucketCounts(
  buckets: { checkInsByMethod?: Record<string, number> }[] | undefined
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const b of buckets ?? []) {
    for (const [k, v] of Object.entries(b.checkInsByMethod ?? {})) {
      acc[k] = (acc[k] ?? 0) + v;
    }
  }
  return acc;
}

function mergeLeadSources(
  buckets: { leadsBySource?: Record<string, number> }[] | undefined
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const b of buckets ?? []) {
    for (const [k, v] of Object.entries(b.leadsBySource ?? {})) {
      acc[k] = (acc[k] ?? 0) + v;
    }
  }
  return acc;
}

function recordToDonutSlices(record: Record<string, number>): ReportDonutSlice[] {
  const entries = Object.entries(record)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return entries.map(([label, value], i) => {
    const id = `k-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return {
      id,
      label,
      value,
      fill: DONUT_COLORS[i % DONUT_COLORS.length],
    };
  });
}

function slicesToChartConfig(slices: ReportDonutSlice[]): ChartConfig {
  const c: ChartConfig = {};
  for (const s of slices) {
    c[s.id] = { label: s.label, color: s.fill };
  }
  return c;
}

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

function defaultRange(): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  return { start: today, end: today };
}

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday UTC, aligned with server `startOfMondayWeek`. */
function getUtcWeekRange(ref: Date): { from: string; to: string } {
  const x = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = x.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + mondayOffset);
  const monday = x;
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { from: formatUtcYmd(monday), to: formatUtcYmd(sunday) };
}

/** Full calendar month UTC containing `ref`. */
function getUtcMonthRange(ref: Date): { from: string; to: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m, lastDay));
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

/** Single UTC calendar day. */
function getUtcTodayRange(ref: Date): { from: string; to: string } {
  const d = formatUtcYmd(
    new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()))
  );
  return { from: d, to: d };
}

type ShortfallScope = 'today' | 'week' | 'month';

function simplePeriodTarget(periodTarget: number, scope: 'week' | 'month'): number {
  if (scope === 'week') return Math.round(periodTarget / 4);
  return periodTarget;
}

/** Mon–Fri inclusive between two UTC calendar days (`yyyy-MM-dd`), aligned with server `workingDaysInclusive`. */
function utcWorkingDaysInclusive(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  const start = new Date(Date.UTC(y1, m1 - 1, d1));
  const end = new Date(Date.UTC(y2, m2 - 1, d2));
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function minIsoDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Scales full-period shortfall target by elapsed Mon–Fri through today (UTC) vs total Mon–Fri in the range. */
function trimShortfallDisplayTarget(
  baseT: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): number {
  if (baseT <= 0) return 0;
  const todayYmd = formatUtcYmd(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  );
  const totalWd = utcWorkingDaysInclusive(rangeFrom, rangeTo);
  if (totalWd <= 0) return baseT;
  const endYmd = minIsoDate(rangeTo, todayYmd);
  if (endYmd < rangeFrom) return 0;
  const elapsedWd = utcWorkingDaysInclusive(rangeFrom, endYmd);
  return Math.round((baseT * elapsedWd) / totalWd);
}

function shortfallTrimmedTarget(
  scope: 'week' | 'month',
  periodTarget: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): number {
  if ((periodTarget ?? 0) <= 0) return 0;
  const baseT = simplePeriodTarget(periodTarget, scope);
  return trimShortfallDisplayTarget(baseT, rangeFrom, rangeTo, now);
}

function shortfallMetricBehindTrimmed(
  scope: 'week' | 'month',
  achieved: number,
  periodTarget: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): boolean {
  if ((periodTarget ?? 0) <= 0) return false;
  const tgt = shortfallTrimmedTarget(scope, periodTarget, rangeFrom, rangeTo, now);
  return achieved < tgt;
}

function shortfallMetricShortfallTrimmed(
  scope: 'week' | 'month',
  achieved: number,
  periodTarget: number,
  rangeFrom: string,
  rangeTo: string,
  now: Date
): number | null {
  if ((periodTarget ?? 0) <= 0) return null;
  const tgt = shortfallTrimmedTarget(scope, periodTarget, rangeFrom, rangeTo, now);
  return Math.max(0, tgt - achieved);
}

function achievedActivityTotal(u: TargetsProgressUserSummary): number {
  return u.achievedCallsInRange + u.achievedVisitsInRange;
}

function userBehindToday(u: TargetsProgressUserSummary): boolean {
  const combined = achievedActivityTotal(u);
  const behindActivity =
    u.periodTargetVisits > 0 && combined < u.cumulativeTargetVisitsEnd;
  const behindLeads =
    u.periodTargetLeads > 0 && u.belowCumulativeLeads;
  return behindActivity || behindLeads;
}

function userBehindOnAny(
  u: TargetsProgressUserSummary,
  scope: ShortfallScope,
  shortfallRange: { from: string; to: string },
  now: Date
): boolean {
  if (scope === 'today') return userBehindToday(u);
  return (
    shortfallMetricBehindTrimmed(
      scope,
      achievedActivityTotal(u),
      u.periodTargetVisits,
      shortfallRange.from,
      shortfallRange.to,
      now
    ) ||
    shortfallMetricBehindTrimmed(
      scope,
      u.achievedLeadsInRange,
      u.periodTargetLeads,
      shortfallRange.from,
      shortfallRange.to,
      now
    )
  );
}

const chartConfig = {
  achievedActivity: {
    label: 'Activity',
    color: REPORT_CHART_HSL.c4,
  },
  achievedLeads: {
    label: 'Leads',
    color: REPORT_CHART_HSL.c3,
  },
} satisfies ChartConfig;

export interface ReportsTargetsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsTargetsTab({ profile, reportsMode }: ReportsTargetsTabProps) {
  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const [{ start: rangeStart, end: rangeEnd }, setRange] = useState(defaultRange);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [shortfallScope, setShortfallScope] = useState<ShortfallScope>('today');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');
  const [onlyBehind, setOnlyBehind] = useState(false);

  const dateFrom = format(rangeStart, 'yyyy-MM-dd');
  const dateTo = format(rangeEnd, 'yyyy-MM-dd');

  const shortfallRange = useMemo(() => {
    const now = new Date();
    if (shortfallScope === 'today') return getUtcTodayRange(now);
    if (shortfallScope === 'week') return getUtcWeekRange(now);
    return getUtcMonthRange(now);
  }, [shortfallScope]);

  const filterSuffix = useMemo(
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

  const chartProgressParams = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
      bucket: 'day' as const,
      ...filterSuffix,
    }),
    [dateFrom, dateTo, filterSuffix]
  );

  const shortfallProgressParams = useMemo(
    () => ({
      from: shortfallRange.from,
      to: shortfallRange.to,
      bucket:
        shortfallScope === 'today'
          ? ('day' as const)
          : shortfallScope === 'week'
            ? ('week' as const)
            : ('month' as const),
      ...filterSuffix,
    }),
    [shortfallRange.from, shortfallRange.to, shortfallScope, filterSuffix]
  );

  const {
    data: chartData,
    isLoading: chartLoading,
    isError: chartIsError,
    error: chartError,
  } = useTargetsProgress(chartProgressParams, {
    enabled: Boolean(dateFrom && dateTo),
  });

  const {
    data: shortfallData,
    isLoading: shortfallLoading,
    isError: shortfallIsError,
    error: shortfallError,
  } = useTargetsProgress(shortfallProgressParams, {
    enabled: Boolean(shortfallRange.from && shortfallRange.to),
  });

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({
    enabled: elevated,
    limit: 250,
    ...(selectedBranchId !== 'all'
      ? { branchId: Number(selectedBranchId) }
      : {}),
  });

  const reportingUsers = useMemo(
    () =>
      elevated ? usersList.filter(userListItemHasPerformanceTarget) : usersList,
    [elevated, usersList]
  );

  useEffect(() => {
    if (!elevated || selectedOwnerUid === 'all') return;
    const ok = reportingUsers.some((u) => String(u.uid) === selectedOwnerUid);
    if (!ok) setSelectedOwnerUid('all');
  }, [elevated, reportingUsers, selectedOwnerUid]);

  useEffect(() => {
    if (!elevated) setOnlyBehind(false);
  }, [elevated]);

  const chartSeriesData = useMemo(() => {
    const rows = chartData?.aggregateBuckets ?? [];
    return rows.map((b) => ({
      label: b.label.length > 14 ? b.key : b.label,
      fullLabel: b.label,
      achievedActivity: b.achievedCalls + b.achievedVisits,
      achievedLeads: b.achievedLeads,
    }));
  }, [chartData?.aggregateBuckets]);

  const checkInsDonutSlices = useMemo(
    () => recordToDonutSlices(mergeBucketCounts(chartData?.aggregateBuckets)),
    [chartData?.aggregateBuckets]
  );
  const leadsDonutSlices = useMemo(
    () => recordToDonutSlices(mergeLeadSources(chartData?.aggregateBuckets)),
    [chartData?.aggregateBuckets]
  );
  const checkInsDonutConfig = useMemo(
    () => slicesToChartConfig(checkInsDonutSlices),
    [checkInsDonutSlices]
  );
  const leadsDonutConfig = useMemo(
    () => slicesToChartConfig(leadsDonutSlices),
    [leadsDonutSlices]
  );
  const checkInsDonutTotal = useMemo(
    () => checkInsDonutSlices.reduce((s, x) => s + x.value, 0),
    [checkInsDonutSlices]
  );
  const leadsDonutTotal = useMemo(
    () => leadsDonutSlices.reduce((s, x) => s + x.value, 0),
    [leadsDonutSlices]
  );

  const summarySubtitle = useMemo(() => {
    if (!elevated) return 'End-of-range cumulative (your progress)';
    if (selectedOwnerUid !== 'all') return 'End-of-range cumulative (selected user)';
    return 'End-of-range cumulative (org aggregate)';
  }, [elevated, selectedOwnerUid]);

  /** API already omits no-target users; keep filter for older servers / mixed clients. */
  const shortfallUsersWithTargets = useMemo(
    () => (shortfallData?.users ?? []).filter((u) => u.hasTarget),
    [shortfallData?.users]
  );

  const chartUsersWithTargets = useMemo(
    () => (chartData?.users ?? []).filter((u) => u.hasTarget),
    [chartData?.users]
  );

  const tableUsers = useMemo(() => {
    const list = shortfallUsersWithTargets;
    if (!onlyBehind) return list;
    const now = new Date();
    return list.filter((u) =>
      userBehindOnAny(u, shortfallScope, shortfallRange, now)
    );
  }, [shortfallUsersWithTargets, onlyBehind, shortfallScope, shortfallRange]);

  const behindCount = useMemo(() => {
    const now = new Date();
    return shortfallUsersWithTargets.filter((u) =>
      userBehindOnAny(u, shortfallScope, shortfallRange, now)
    ).length;
  }, [shortfallUsersWithTargets, shortfallScope, shortfallRange]);

  function downloadShortfallCsv() {
    const now = new Date();
    const users = shortfallUsersWithTargets.filter((u) =>
      onlyBehind ? userBehindOnAny(u, shortfallScope, shortfallRange, now) : true
    );
    const scopeLabel =
      shortfallScope === 'today'
        ? 'today'
        : shortfallScope === 'week'
          ? 'week'
          : 'month';
    const headers = [
      'UID',
      'Name',
      'Surname',
      'Scope',
      `Target activity (${scopeLabel})`,
      'Achieved activity',
      'Shortfall activity',
      `Target leads (${scopeLabel})`,
      'Achieved leads',
      'Shortfall leads',
      'Behind on targets',
    ];
    const rows = users.map((u) => {
      let ta: number;
      let tl: number;
      let sa: number | null;
      let sl: number | null;
      const achievedAct = achievedActivityTotal(u);
      if (shortfallScope === 'today') {
        ta = u.cumulativeTargetVisitsEnd;
        tl = u.cumulativeTargetLeadsEnd;
        sa =
          u.periodTargetVisits > 0
            ? Math.max(0, u.cumulativeTargetVisitsEnd - achievedAct)
            : null;
        sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
      } else {
        ta = shortfallTrimmedTarget(
          shortfallScope,
          u.periodTargetVisits,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
        tl = shortfallTrimmedTarget(
          shortfallScope,
          u.periodTargetLeads,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
        sa = shortfallMetricShortfallTrimmed(
          shortfallScope,
          achievedAct,
          u.periodTargetVisits,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
        sl = shortfallMetricShortfallTrimmed(
          shortfallScope,
          u.achievedLeadsInRange,
          u.periodTargetLeads,
          shortfallRange.from,
          shortfallRange.to,
          now
        );
      }
      return [
        String(u.uid),
        u.name,
        u.surname,
        scopeLabel,
        u.periodTargetVisits > 0 ? String(ta) : '',
        String(achievedAct),
        sa != null ? String(sa) : '',
        u.periodTargetLeads > 0 ? String(tl) : '',
        String(u.achievedLeadsInRange),
        sl != null ? String(sl) : '',
        userBehindOnAny(u, shortfallScope, shortfallRange, now) ? 'yes' : 'no',
      ];
    });
    exportToCsv(
      headers,
      rows,
      `targets-shortfall-${shortfallRange.from}-${shortfallRange.to}-${scopeLabel}`
    );
  }

  const isLoading = chartLoading;
  const isError = chartIsError;
  const error = chartError;

  const shortfallEvalNow = new Date();

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-9 w-full justify-start text-left font-normal sm:w-[260px]',
                selectTriggerClass
              )}
            >
              <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              {format(rangeStart, 'MMM d, yyyy')} –{' '}
              {format(rangeEnd, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={{ from: rangeStart, to: rangeEnd }}
              onSelect={(r) => {
                if (r?.from) {
                  setRange({
                    start: startOfDay(r.from),
                    end: startOfDay(r.to ?? r.from),
                  });
                }
              }}
            />
            <div className="flex flex-wrap justify-end gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = startOfDay(new Date());
                  setRange({ start: today, end: today });
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPopoverOpen(false)}
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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

        <Button
          type="button"
          className="h-9 w-full shrink-0 bg-violet-600 text-white hover:bg-violet-700 sm:ml-auto sm:w-auto dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700"
          disabled={!shortfallUsersWithTargets.length}
          onClick={() => downloadShortfallCsv()}
        >
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : isError ? (
        <p className="text-center text-destructive py-8">
          {(error as Error)?.message ?? 'Failed to load targets progress'}
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border border-gray-200 bg-white shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" aria-hidden />
                  Achieved activity by day
                </CardTitle>
                <CardDescription>
                  Activity (all check-ins) and leads per day ({dateFrom} – {dateTo})
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-0">
                {chartSeriesData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 px-6">
                    No days in this range.
                  </p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[340px] w-full">
                    <BarChart accessibilityLayer data={chartSeriesData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={40} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="dashed"
                            labelFormatter={(_, payload) =>
                              (payload?.[0]?.payload as { fullLabel?: string })
                                ?.fullLabel ?? ''
                            }
                          />
                        }
                      />
                      <ChartLegend
                        content={<ChartLegendContent className="flex-wrap" />}
                        verticalAlign="top"
                      />
                      <Bar
                        dataKey="achievedActivity"
                        fill="var(--color-achievedActivity)"
                        radius={4}
                      />
                      <Bar
                        dataKey="achievedLeads"
                        fill="var(--color-achievedLeads)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                  <Users className="size-4 shrink-0" aria-hidden />
                  {chartUsersWithTargets.length} user(s) in scope
                  {elevated && behindCount > 0 ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      · {behindCount} behind (current progress scope)
                    </span>
                  ) : null}
                </div>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
                <CardDescription>{summarySubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(() => {
                  const b = chartData?.aggregateBuckets ?? [];
                  const last = b[b.length - 1];
                  if (!last) {
                    return (
                      <p className="text-muted-foreground">No data for this range.</p>
                    );
                  }
                  function row(
                    label: string,
                    target: number,
                    achieved: number
                  ) {
                    return (
                      <div className="rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 dark:bg-zinc-900/40">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <p className="mt-1 tabular-nums text-foreground">
                          <span className="text-muted-foreground">Target </span>
                          <span className="font-medium">{target}</span>
                          <span className="mx-1.5 text-muted-foreground">·</span>
                          <span className="text-muted-foreground">Achieved </span>
                          <span className="font-medium">{achieved}</span>
                        </p>
                      </div>
                    );
                  }
                  return (
                    <>
                      {row(
                        'Activity',
                        last.cumulativeTargetVisits,
                        last.cumulativeAchievedCalls +
                          last.cumulativeAchievedVisits
                      )}
                      {row(
                        'Leads',
                        last.cumulativeTargetLeads,
                        last.cumulativeAchievedLeads
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Check-ins by contact type</CardTitle>
                <CardDescription>
                  {dateFrom} – {dateTo} (users with targets)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checkInsDonutTotal === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No check-ins in this range.
                  </p>
                ) : (
                  <ReportDonutChart
                    config={checkInsDonutConfig}
                    data={checkInsDonutSlices}
                    centerPrimary={String(checkInsDonutTotal)}
                    centerSecondary="check-ins"
                  />
                )}
              </CardContent>
            </Card>
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Leads by source</CardTitle>
                <CardDescription>
                  {dateFrom} – {dateTo} (users with targets)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leadsDonutTotal === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No leads in this range.
                  </p>
                ) : (
                  <ReportDonutChart
                    config={leadsDonutConfig}
                    data={leadsDonutSlices}
                    centerPrimary={String(leadsDonutTotal)}
                    centerSecondary="leads"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" aria-hidden />
                Current Progress
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {elevated ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="only-behind"
                      checked={onlyBehind}
                      onCheckedChange={setOnlyBehind}
                    />
                    <Label htmlFor="only-behind" className="text-sm cursor-pointer">
                      Behind on Targets
                    </Label>
                  </div>
                ) : null}
                <Select
                  value={shortfallScope}
                  onValueChange={(v) => setShortfallScope(v as ShortfallScope)}
                >
                  <SelectTrigger
                    className={cn(selectTriggerClass, 'sm:min-w-[200px] sm:w-[200px]')}
                  >
                    <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today (UTC)</SelectItem>
                    <SelectItem value="week">This week (UTC)</SelectItem>
                    <SelectItem value="month">This month (UTC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {shortfallIsError ? (
              <p className="text-sm text-destructive">
                {(shortfallError as Error)?.message ?? 'Failed to load current progress data'}
              </p>
            ) : null}

            <div className="rounded-md border border-gray-200 bg-white overflow-x-auto">
              {shortfallLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Name</TableHead>
                      <TableHead className="text-right" colSpan={3}>
                        Activity
                        <span className="block text-xs font-normal text-muted-foreground">
                          T / A / short · target from check-ins
                        </span>
                      </TableHead>
                      <TableHead className="text-right" colSpan={3}>
                        Leads
                        <span className="block text-xs font-normal text-muted-foreground">
                          T / A / short
                        </span>
                      </TableHead>
                      <TableHead className="text-right min-w-[72px]">Behind</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          No rows for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableUsers.map((u) => {
                        let ta: number;
                        let tl: number;
                        let sa: number | null;
                        let sl: number | null;
                        const achievedAct = achievedActivityTotal(u);
                        if (shortfallScope === 'today') {
                          ta = u.cumulativeTargetVisitsEnd;
                          tl = u.cumulativeTargetLeadsEnd;
                          sa =
                            u.periodTargetVisits > 0
                              ? Math.max(
                                  0,
                                  u.cumulativeTargetVisitsEnd - achievedAct
                                )
                              : null;
                          sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
                        } else {
                          ta = shortfallTrimmedTarget(
                            shortfallScope,
                            u.periodTargetVisits,
                            shortfallRange.from,
                            shortfallRange.to,
                            shortfallEvalNow
                          );
                          tl = shortfallTrimmedTarget(
                            shortfallScope,
                            u.periodTargetLeads,
                            shortfallRange.from,
                            shortfallRange.to,
                            shortfallEvalNow
                          );
                          sa = shortfallMetricShortfallTrimmed(
                            shortfallScope,
                            achievedAct,
                            u.periodTargetVisits,
                            shortfallRange.from,
                            shortfallRange.to,
                            shortfallEvalNow
                          );
                          sl = shortfallMetricShortfallTrimmed(
                            shortfallScope,
                            u.achievedLeadsInRange,
                            u.periodTargetLeads,
                            shortfallRange.from,
                            shortfallRange.to,
                            shortfallEvalNow
                          );
                        }
                        const behind = userBehindOnAny(
                          u,
                          shortfallScope,
                          shortfallRange,
                          shortfallEvalNow
                        );
                        const hasAnyMetricTarget =
                          u.periodTargetVisits > 0 || u.periodTargetLeads > 0;
                        return (
                          <TableRow
                            key={u.uid}
                            className={cn(
                              behind &&
                                hasAnyMetricTarget &&
                                'bg-red-50 text-red-950 dark:bg-red-950/35 dark:text-red-50'
                            )}
                          >
                            <TableCell className="font-medium">
                              {[u.name, u.surname].filter(Boolean).join(' ')}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {u.periodTargetVisits > 0 ? ta : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {achievedAct}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {sa != null ? sa : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {u.periodTargetLeads > 0 ? tl : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {u.achievedLeadsInRange}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {sl != null ? sl : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {behind ? 'Yes' : 'No'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
