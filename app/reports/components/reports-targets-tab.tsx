'use client';

import { useMemo, useState } from 'react';
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

function shortfallMetricBehindSimple(
  scope: 'week' | 'month',
  achieved: number,
  periodTarget: number
): boolean {
  if ((periodTarget ?? 0) <= 0) return false;
  const tgt = simplePeriodTarget(periodTarget, scope);
  return achieved < tgt;
}

function shortfallMetricShortfallSimple(
  scope: 'week' | 'month',
  achieved: number,
  periodTarget: number
): number | null {
  if ((periodTarget ?? 0) <= 0) return null;
  const tgt = simplePeriodTarget(periodTarget, scope);
  return Math.max(0, tgt - achieved);
}

function userBehindToday(u: TargetsProgressUserSummary): boolean {
  return (
    (u.periodTargetCalls > 0 && u.belowCumulativeCalls) ||
    (u.periodTargetVisits > 0 && u.belowCumulativeVisits) ||
    (u.periodTargetLeads > 0 && u.belowCumulativeLeads)
  );
}

function userBehindOnAny(
  u: TargetsProgressUserSummary,
  scope: ShortfallScope
): boolean {
  if (scope === 'today') return userBehindToday(u);
  return (
    shortfallMetricBehindSimple(
      scope,
      u.achievedCallsInRange,
      u.periodTargetCalls
    ) ||
    shortfallMetricBehindSimple(
      scope,
      u.achievedVisitsInRange,
      u.periodTargetVisits
    ) ||
    shortfallMetricBehindSimple(
      scope,
      u.achievedLeadsInRange,
      u.periodTargetLeads
    )
  );
}

const chartConfig = {
  achievedLeads: {
    label: 'Leads',
    color: REPORT_CHART_HSL.c3,
  },
  achievedVisits: {
    label: 'Visits',
    color: REPORT_CHART_HSL.c4,
  },
  achievedCalls: {
    label: 'Calls',
    color: REPORT_CHART_HSL.c1,
  },
} satisfies ChartConfig;

export interface ReportsTargetsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsTargetsTab({ profile, reportsMode }: ReportsTargetsTabProps) {
  const [{ start: rangeStart, end: rangeEnd }, setRange] = useState(defaultRange);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [shortfallScope, setShortfallScope] = useState<ShortfallScope>('week');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');
  const [onlyBehind, setOnlyBehind] = useState(false);

  const dateFrom = format(rangeStart, 'yyyy-MM-dd');
  const dateTo = format(rangeEnd, 'yyyy-MM-dd');
  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

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

  const chartSeriesData = useMemo(() => {
    const rows = chartData?.aggregateBuckets ?? [];
    return rows.map((b) => ({
      label: b.label.length > 14 ? b.key : b.label,
      fullLabel: b.label,
      achievedLeads: b.achievedLeads,
      achievedVisits: b.achievedVisits,
      achievedCalls: b.achievedCalls,
    }));
  }, [chartData?.aggregateBuckets]);

  const summarySubtitle = useMemo(() => {
    if (!elevated) return 'End-of-range cumulative (your progress)';
    if (selectedOwnerUid !== 'all') return 'End-of-range cumulative (selected user)';
    return 'End-of-range cumulative (org aggregate)';
  }, [elevated, selectedOwnerUid]);

  const tableUsers = useMemo(() => {
    const list = shortfallData?.users ?? [];
    if (!onlyBehind) return list;
    return list.filter((u) => userBehindOnAny(u, shortfallScope));
  }, [shortfallData?.users, onlyBehind, shortfallScope]);

  const behindCount = useMemo(() => {
    return (shortfallData?.users ?? []).filter((u) =>
      userBehindOnAny(u, shortfallScope)
    ).length;
  }, [shortfallData?.users, shortfallScope]);

  function downloadShortfallCsv() {
    const users = (shortfallData?.users ?? []).filter((u) =>
      onlyBehind ? userBehindOnAny(u, shortfallScope) : true
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
      `Target calls (${scopeLabel})`,
      'Achieved calls',
      'Shortfall calls',
      `Target visits (${scopeLabel})`,
      'Achieved visits',
      'Shortfall visits',
      `Target leads (${scopeLabel})`,
      'Achieved leads',
      'Shortfall leads',
      'Behind on targets',
    ];
    const rows = users.map((u) => {
      let tc: number;
      let tv: number;
      let tl: number;
      let sc: number | null;
      let sv: number | null;
      let sl: number | null;
      if (shortfallScope === 'today') {
        tc = u.cumulativeTargetCallsEnd;
        tv = u.cumulativeTargetVisitsEnd;
        tl = u.cumulativeTargetLeadsEnd;
        sc = u.periodTargetCalls > 0 ? u.shortfallCalls : null;
        sv = u.periodTargetVisits > 0 ? u.shortfallVisits : null;
        sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
      } else {
        tc = simplePeriodTarget(u.periodTargetCalls, shortfallScope);
        tv = simplePeriodTarget(u.periodTargetVisits, shortfallScope);
        tl = simplePeriodTarget(u.periodTargetLeads, shortfallScope);
        sc = shortfallMetricShortfallSimple(
          shortfallScope,
          u.achievedCallsInRange,
          u.periodTargetCalls
        );
        sv = shortfallMetricShortfallSimple(
          shortfallScope,
          u.achievedVisitsInRange,
          u.periodTargetVisits
        );
        sl = shortfallMetricShortfallSimple(
          shortfallScope,
          u.achievedLeadsInRange,
          u.periodTargetLeads
        );
      }
      return [
        String(u.uid),
        u.name,
        u.surname,
        scopeLabel,
        u.periodTargetCalls > 0 ? String(tc) : '',
        String(u.achievedCallsInRange),
        sc != null ? String(sc) : '',
        u.periodTargetVisits > 0 ? String(tv) : '',
        String(u.achievedVisitsInRange),
        sv != null ? String(sv) : '',
        u.periodTargetLeads > 0 ? String(tl) : '',
        String(u.achievedLeadsInRange),
        sl != null ? String(sl) : '',
        userBehindOnAny(u, shortfallScope) ? 'yes' : 'no',
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
                {usersList.map((u) => (
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
          disabled={!shortfallData?.users?.length}
          onClick={() => downloadShortfallCsv()}
        >
          Export CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Chart and summary use the date range above (daily buckets). Targets are prorated by
        weekday across each user&apos;s target period. Achieved counts come from check-ins
        (physical = visits, other = calls) and leads created in range. The shortfall list can use{' '}
        <strong className="font-medium text-foreground">today</strong>,{' '}
        <strong className="font-medium text-foreground">this week</strong>, or{' '}
        <strong className="font-medium text-foreground">this month</strong> (UTC). Today uses the
        API prorated day target; week uses period target ÷ 4; month uses full period targets.
        External ERP adjustments aren&apos;t shown here.
      </p>

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
                  Leads, visits, and calls achieved per day ({dateFrom} – {dateTo})
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
                        dataKey="achievedLeads"
                        fill="var(--color-achievedLeads)"
                        radius={4}
                      />
                      <Bar
                        dataKey="achievedVisits"
                        fill="var(--color-achievedVisits)"
                        radius={4}
                      />
                      <Bar
                        dataKey="achievedCalls"
                        fill="var(--color-achievedCalls)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                  <Users className="size-4 shrink-0" aria-hidden />
                  {chartData?.users.length ?? 0} user(s) in scope
                  {elevated && behindCount > 0 ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      · {behindCount} behind (shortfall list scope)
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
                        'Calls',
                        last.cumulativeTargetCalls,
                        last.cumulativeAchievedCalls
                      )}
                      {row(
                        'Visits',
                        last.cumulativeTargetVisits,
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

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" aria-hidden />
                Shortfall list (HR)
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
              </div>
            </div>

            {shortfallIsError ? (
              <p className="text-sm text-destructive">
                {(shortfallError as Error)?.message ?? 'Failed to load shortfall data'}
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
                        Calls{' '}
                        <span className="block text-xs font-normal text-muted-foreground">
                          T / A / short
                        </span>
                      </TableHead>
                      <TableHead className="text-right" colSpan={3}>
                        Visits
                        <span className="block text-xs font-normal text-muted-foreground">
                          T / A / short
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
                          colSpan={11}
                          className="text-center text-muted-foreground py-8"
                        >
                          No rows for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableUsers.map((u) => {
                        let tc: number;
                        let tv: number;
                        let tl: number;
                        let sc: number | null;
                        let sv: number | null;
                        let sl: number | null;
                        if (shortfallScope === 'today') {
                          tc = u.cumulativeTargetCallsEnd;
                          tv = u.cumulativeTargetVisitsEnd;
                          tl = u.cumulativeTargetLeadsEnd;
                          sc = u.periodTargetCalls > 0 ? u.shortfallCalls : null;
                          sv = u.periodTargetVisits > 0 ? u.shortfallVisits : null;
                          sl = u.periodTargetLeads > 0 ? u.shortfallLeads : null;
                        } else {
                          tc = simplePeriodTarget(u.periodTargetCalls, shortfallScope);
                          tv = simplePeriodTarget(u.periodTargetVisits, shortfallScope);
                          tl = simplePeriodTarget(u.periodTargetLeads, shortfallScope);
                          sc = shortfallMetricShortfallSimple(
                            shortfallScope,
                            u.achievedCallsInRange,
                            u.periodTargetCalls
                          );
                          sv = shortfallMetricShortfallSimple(
                            shortfallScope,
                            u.achievedVisitsInRange,
                            u.periodTargetVisits
                          );
                          sl = shortfallMetricShortfallSimple(
                            shortfallScope,
                            u.achievedLeadsInRange,
                            u.periodTargetLeads
                          );
                        }
                        const behind = userBehindOnAny(u, shortfallScope);
                        const hasAnyMetricTarget =
                          u.periodTargetCalls > 0 ||
                          u.periodTargetVisits > 0 ||
                          u.periodTargetLeads > 0;
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
                              {!u.hasTarget ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (no target set)
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {u.periodTargetCalls > 0 ? tc : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {u.achievedCallsInRange}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {sc != null ? sc : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {u.periodTargetVisits > 0 ? tv : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {u.achievedVisitsInRange}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {sv != null ? sv : '—'}
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
                              {!hasAnyMetricTarget
                                ? '—'
                                : behind
                                  ? 'Yes'
                                  : 'No'}
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
