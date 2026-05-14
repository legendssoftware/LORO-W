'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import type { DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CalendarIcon,
  Coffee,
  Shield,
  Sunrise,
  Sunset,
  Timer,
} from 'lucide-react';
import type { SyncProfile } from '@/api/types';
import type { BranchListItem } from '@/api/types/branch';
import { AccessLevel } from '@/api/types/user';
import type { AttendanceReportUserMetric } from '@/api/types';
import type { ClockInOptionKey } from '@/api/types/attendance';
import {
  useAttendanceByDateRange,
  useAttendanceReport,
  useBranches,
  useDailyOverview,
  usePayrollHoursAll,
  useUsers,
} from '@/api/hooks';
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
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LoadingSpinner } from '@/components/loading-spinner';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { AttendanceHoursSummaryDialog } from '@/app/reports/components/attendance-hours-summary-dialog';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import {
  SearchableBranchPicker,
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import type { SearchableOptionRow } from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { ATT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import type { ReportsMode } from '@/app/reports/reports-content';
import type { AttendanceRangeCheckIn } from '@/app/reports/types/attendance-range-check-in';
import {
  userListItemHasPerformanceTarget,
} from '@/app/reports/utils/user-has-performance-target';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';

export { ATT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';

/** Matches server `ClockInOptionKey` plus legacy free-text; used only for grouping. */
type ClockInBucketId = ClockInOptionKey | 'other';

const CLOCK_IN_BUCKET_ORDER: readonly ClockInBucketId[] = [
  'at_office',
  'starting_from_home',
  'work_from_home',
  'offsite',
  'driving',
  'other',
] as const;

const CLOCK_IN_BUCKET_LABEL: Record<ClockInBucketId, string> = {
  at_office: 'At office',
  starting_from_home: 'From home',
  work_from_home: 'Working from home',
  offsite: 'Offsite',
  driving: 'Driving',
  other: 'Other',
};

/** Stable bar color per bucket (independent of sort order). */
const CLOCK_IN_BUCKET_COLOR: Record<ClockInBucketId, string> = {
  at_office: ATT_CHART_HSL.c1,
  starting_from_home: ATT_CHART_HSL.c2,
  work_from_home: ATT_CHART_HSL.c3,
  offsite: ATT_CHART_HSL.c4,
  driving: ATT_CHART_HSL.c5,
  other: 'hsl(215 14% 46%)',
};

const ROLE_OPTIONS = Object.values(AccessLevel).filter(
  (r) => r !== AccessLevel.CLIENT
);

const ROLE_PICKER_OPTIONS: SearchableOptionRow[] = ROLE_OPTIONS.map((r) => ({
  value: r,
  label: r,
  icon: <Shield className="size-4 shrink-0" />,
  searchExtra: r.replace(/_/g, ' '),
}));

/** Accepts `checkIn` or legacy/alternate `checkInTime` from API payloads. */
function parseCheckIns(rows: unknown[]): AttendanceRangeCheckIn[] {
  const out: AttendanceRangeCheckIn[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    const checkIn =
      typeof r.checkIn === 'string'
        ? r.checkIn
        : typeof r.checkInTime === 'string'
          ? r.checkInTime
          : null;
    if (checkIn == null) continue;
    out.push({ ...r, checkIn } as AttendanceRangeCheckIn);
  }
  return out;
}

function filterCheckIns(
  rows: AttendanceRangeCheckIn[],
  filters: {
    branchUid: string;
    role: string;
    userUid: string;
    search: string;
    /** When set, rows are restricted to these owner uids (unused for org-wide “all users”). */
    reportingUserUids?: Set<number> | null;
  }
): AttendanceRangeCheckIn[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const o = row.owner;
    if (filters.branchUid !== 'all') {
      const bid = Number(filters.branchUid);
      if (Number.isFinite(bid) && (o?.branch?.uid ?? null) !== bid) {
        return false;
      }
    }
    if (filters.role !== 'all') {
      const al = (o?.accessLevel ?? '').toLowerCase();
      if (al !== filters.role.toLowerCase()) return false;
    }
    if (filters.userUid !== 'all') {
      const uid = Number(filters.userUid);
      if (!Number.isFinite(uid) || o?.uid !== uid) return false;
    }
    if (
      filters.reportingUserUids &&
      filters.userUid === 'all'
    ) {
      const uid = o?.uid;
      if (uid == null || !filters.reportingUserUids.has(uid)) return false;
    }
    if (q) {
      const name = [o?.name, o?.surname]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const email = (o?.email ?? '').toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Maps `checkInNotes` to a bucket aligned with server clock-in option keys
 * (`ClockInOptionKey`). Checks `starting_from_home` before `work_from_home`.
 */
function bucketCheckInLocation(notes: string | null | undefined): ClockInBucketId {
  const n = (notes ?? '').trim().toLowerCase();
  if (!n) return 'other';

  if (n.includes('starting_from_home')) return 'starting_from_home';
  if (n.includes('work_from_home')) return 'work_from_home';
  if (n.includes('at_office')) return 'at_office';
  if (n.includes('offsite')) return 'offsite';
  if (n.includes('driving')) return 'driving';

  if (n.includes('wfh')) return 'work_from_home';
  if (n.includes('working from home')) return 'work_from_home';
  if (n.includes('from home')) return 'starting_from_home';
  if (n.includes('office')) return 'at_office';

  return 'other';
}

function filterUserMetricsForSummary(
  rows: AttendanceReportUserMetric[],
  filters: {
    userUid: string;
    search: string;
  }
): AttendanceReportUserMetric[] {
  const q = filters.search.trim().toLowerCase();
  let out = rows;
  if (filters.userUid !== 'all') {
    const uid = Number(filters.userUid);
    if (Number.isFinite(uid)) {
      out = out.filter((r) => r.userId === uid);
    }
  }
  if (q) {
    out = out.filter((r) => {
      const name = `${r.userInfo?.name ?? ''} ${r.userInfo?.email ?? ''}`.toLowerCase();
      return name.includes(q);
    });
  }
  return out;
}

export interface ReportsAttendanceTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsAttendanceTab({
  profile,
  reportsMode,
}: ReportsAttendanceTabProps) {
  const todayStr = formatUtcYmd(utcToday());

  const [startDate, setStartDate] = useState(() => utcMonthStartThroughToday().start);
  const [endDate, setEndDate] = useState(() => utcMonthStartThroughToday().end);
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);

  const [draft, setDraft] = useState<DateRange | undefined>(() => {
    const r = utcMonthStartThroughToday();
    return { from: r.start, to: r.end };
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUserUid, setSelectedUserUid] = useState<string>('all');
  const [summaryOpen, setSummaryOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- sync filter defaults when entering self mode */
  useEffect(() => {
    if (reportsMode !== 'self' || profile?.uid == null) return;
    setSelectedUserUid(String(profile.uid));
    setSelectedBranchId('all');
    setSelectedRole('all');
  }, [reportsMode, profile?.uid]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const defaultReportRange = utcMonthStartThroughToday();

  const finalizeDraftRange = useCallback(() => {
    const from = draft?.from ?? startDate;
    const toRaw = draft?.to ?? draft?.from ?? endDate;
    const ordered = orderUtcCalendarRange(from, toRaw);
    setStartDate(ordered.start);
    setEndDate(ordered.end);
  }, [draft, startDate, endDate]);

  const handleDateRangePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (open) setDraft({ from: startDate, to: endDate });
      else finalizeDraftRange();
      setDateRangePopoverOpen(open);
    },
    [startDate, endDate, finalizeDraftRange]
  );

  const dateFrom = formatUtcYmd(startDate);
  const dateTo = formatUtcYmd(endDate);

  const orgId = profile?.organisationRef ?? undefined;

  const reportParamsBase = {
    dateFrom,
    dateTo,
    includeUserDetails: false as const,
    ...(reportsMode === 'org'
      ? {
          branchId:
            selectedBranchId !== 'all' ? selectedBranchId : undefined,
          role:
            selectedRole !== 'all'
              ? (selectedRole as (typeof ROLE_OPTIONS)[number])
              : undefined,
        }
      : {}),
  };

  const reportQuery = useAttendanceReport(reportParamsBase, {
    enabled: Boolean(dateFrom && dateTo),
  });

  const reportDetailQuery = useAttendanceReport(
    {
      ...reportParamsBase,
      includeUserDetails: true,
    },
    {
      enabled: Boolean(dateFrom && dateTo) && summaryOpen,
    }
  );

  const payrollQuery = usePayrollHoursAll(
    {
      branchId:
        reportsMode === 'org' && selectedBranchId !== 'all'
          ? selectedBranchId
          : undefined,
    },
    { enabled: summaryOpen }
  );

  const rangeQuery = useAttendanceByDateRange(
    dateFrom && dateTo
      ? { startDate: dateFrom, endDate: dateTo, orgId }
      : null,
    { enabled: Boolean(dateFrom && dateTo) }
  );

  const dailyOverviewQuery = useDailyOverview(
    { date: todayStr },
    { enabled: true }
  );

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({
    limit: 200,
    enabled: reportsMode === 'org',
    ...(selectedBranchId !== 'all'
      ? { branchId: Number(selectedBranchId) }
      : {}),
  });

  const reportingUsers = useMemo(
    () =>
      reportsMode === 'org'
        ? usersList.filter(userListItemHasPerformanceTarget)
        : usersList,
    [reportsMode, usersList]
  );

  const effectiveUserUid = useMemo(() => {
    if (reportsMode !== 'org' || selectedUserUid === 'all') return selectedUserUid;
    return reportingUsers.some((u) => String(u.uid) === selectedUserUid)
      ? selectedUserUid
      : 'all';
  }, [reportsMode, reportingUsers, selectedUserUid]);

  const rawCheckIns = useMemo(
    () => parseCheckIns(rangeQuery.data?.checkIns ?? []),
    [rangeQuery.data?.checkIns]
  );

  const filterState = useMemo(
    () => ({
      branchUid: selectedBranchId,
      role: selectedRole,
      userUid: effectiveUserUid,
      search: '',
      reportingUserUids: null,
    }),
    [selectedBranchId, selectedRole, effectiveUserUid]
  );

  const checkIns = useMemo(
    () => filterCheckIns(rawCheckIns, filterState),
    [rawCheckIns, filterState]
  );

  const summaryUserMetrics = useMemo(() => {
    const rows = reportDetailQuery.data?.report.userMetrics ?? [];
    return filterUserMetricsForSummary(rows, {
      userUid: effectiveUserUid,
      search: '',
    });
  }, [reportDetailQuery.data?.report.userMetrics, effectiveUserUid]);

  const pieConfig = {
    late: { label: 'Late', color: ATT_CHART_HSL.c1 },
    onTime: { label: 'On time', color: ATT_CHART_HSL.c3 },
  } satisfies ChartConfig;

  const lineConfig = {
    onTimePct: {
      label: 'On-time %',
      color: ATT_CHART_HSL.c2,
    },
  } satisfies ChartConfig;

  const barConfig = {
    count: { label: 'Clock-ins', color: ATT_CHART_HSL.c4 },
  } satisfies ChartConfig;

  const radialConfig = {
    attended: { label: 'Present', color: ATT_CHART_HSL.c3 },
    remainder: { label: 'Absent', color: ATT_CHART_HSL.c1 },
  } satisfies ChartConfig;

  /** RadialBarChart uses legendContent "children" and derives labels from row `name`, so both segments showed "today". Explicit payload fixes the legend. */
  const radialLegendPayload = useMemo(
    () => [
      {
        value: 'Present',
        type: 'square' as const,
        id: 'attended',
        color: ATT_CHART_HSL.c3,
        dataKey: 'attended',
      },
      {
        value: 'Absent',
        type: 'square' as const,
        id: 'remainder',
        color: ATT_CHART_HSL.c1,
        dataKey: 'remainder',
      },
    ],
    []
  );

  const pieData = useMemo(() => {
    let late = 0;
    let onTime = 0;
    for (const row of checkIns) {
      if ((row.lateMinutes ?? 0) > 0) late += 1;
      else onTime += 1;
    }
    return [
      {
        id: 'onTime',
        label: 'On time',
        value: onTime,
        fill: 'var(--color-onTime)',
      },
      {
        id: 'late',
        label: 'Late',
        value: late,
        fill: 'var(--color-late)',
      },
    ];
  }, [checkIns]);

  const pieCheckInTotal = useMemo(
    () => pieData.reduce((s, x) => s + x.value, 0),
    [pieData]
  );

  const lineData = useMemo(() => {
    const byDay = new Map<string, { total: number; onTime: number }>();
    for (const row of checkIns) {
      const day = format(new Date(row.checkIn), 'yyyy-MM-dd');
      const cur = byDay.get(day) ?? { total: 0, onTime: 0 };
      cur.total += 1;
      if ((row.lateMinutes ?? 0) <= 0) cur.onTime += 1;
      byDay.set(day, cur);
    }
    const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([date, { total, onTime }]) => ({
      date,
      onTimePct: total > 0 ? Math.round((onTime / total) * 100) : 0,
    }));
  }, [checkIns]);

  const barData = useMemo(() => {
    const counts = new Map<ClockInBucketId, number>();
    for (const row of checkIns) {
      const id = bucketCheckInLocation(row.checkInNotes);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return CLOCK_IN_BUCKET_ORDER.filter((id) => (counts.get(id) ?? 0) > 0).map(
      (id) => ({
        location: CLOCK_IN_BUCKET_LABEL[id],
        count: counts.get(id)!,
        fill: CLOCK_IN_BUCKET_COLOR[id],
      })
    );
  }, [checkIns]);

  const attendanceRateToday =
    dailyOverviewQuery.data?.data.attendanceRate ?? 0;

  const radialData = useMemo(
    () => [
      {
        name: 'today',
        attended: Math.min(100, Math.max(0, attendanceRateToday)),
        remainder: Math.min(100, Math.max(0, 100 - attendanceRateToday)),
      },
    ],
    [attendanceRateToday]
  );

  const avg = reportQuery.data?.report.organizationMetrics?.averageTimes;

  const isLoadingMain =
    reportQuery.isLoading || rangeQuery.isLoading;

  const dailyOverviewLoading =
    dailyOverviewQuery.isLoading && !dailyOverviewQuery.data;

  const hasRangeCheckIns = checkIns.length > 0;

  const periodLabel = `${dateFrom} – ${dateTo}`;
  const isDefaultRange =
    formatUtcYmd(startDate) === formatUtcYmd(defaultReportRange.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(defaultReportRange.end);

  return (
    <div className="space-y-8 py-4">
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max flex-nowrap items-center gap-2">
          <div className="flex items-center gap-0">
            <Popover
              open={dateRangePopoverOpen}
              onOpenChange={handleDateRangePopoverOpenChange}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    reportsFilterSelectTriggerClass,
                    'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px] gap-2'
                  )}
                >
                  <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                  {formatUtcYmd(startDate) === formatUtcYmd(endDate)
                    ? formatUtcCalendarLabel(startDate)
                    : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={cn('w-[95vw] max-w-lg p-0 sm:w-auto', reportsFilterPortalHighZ)}
                align="center"
              >
                <Calendar
                  mode="range"
                  selected={draft}
                  onSelect={(r) => {
                    if (!r) {
                      setDraft(undefined);
                      return;
                    }
                    setDraft({
                      from: r.from
                        ? utcCalendarDateFromLocalPickerDate(r.from)
                        : undefined,
                      to: r.to
                        ? utcCalendarDateFromLocalPickerDate(r.to)
                        : undefined,
                    });
                  }}
                  initialFocus
                  numberOfMonths={2}
                />
                <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const t = utcToday();
                        setStartDate(t);
                        setEndDate(t);
                        setDateRangePopoverOpen(false);
                      }}
                    >
                      Today (UTC)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { start, end } = utcMonthStartThroughToday();
                        setStartDate(start);
                        setEndDate(end);
                        setDateRangePopoverOpen(false);
                      }}
                    >
                      This month (UTC)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { from, to } = getUtcMonthRange(utcToday());
                        setStartDate(utcDateFromYmd(from));
                        setEndDate(utcDateFromYmd(to));
                        setDateRangePopoverOpen(false);
                      }}
                    >
                      Whole month (UTC)
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className={cn(
                      'bg-violet-600 text-white shadow-sm border-transparent',
                      'hover:bg-violet-700 hover:text-white',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2'
                    )}
                    onClick={() => handleDateRangePopoverOpenChange(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {!isDefaultRange ? (
              <button
                type="button"
                onClick={() => {
                  const r = utcMonthStartThroughToday();
                  setStartDate(r.start);
                  setEndDate(r.end);
                }}
                className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                aria-label="Reset date range"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>

          {reportsMode === 'org' ? (
            <>
              <SearchableBranchPicker
                branches={branches as BranchListItem[]}
                selectedBranchId={selectedBranchId}
                onBranchChange={(v) => {
                  setSelectedBranchId(v);
                  setSelectedUserUid('all');
                }}
                triggerClassName="h-9 w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]"
              />

              <SearchableOptionListPicker
                selectedValue={selectedRole}
                onValueChange={setSelectedRole}
                options={ROLE_PICKER_OPTIONS}
                placeholderLabelWhenAll="All roles"
                searchPlaceholder="Search roles…"
                emptyMessage="No role found."
                triggerIcon={<Shield className="size-4 shrink-0" />}
                triggerClassName="h-9 w-[170px] shrink-0 sm:w-[200px]"
              />

              <SearchableUserPicker
                users={reportingUsers}
                branches={branches as BranchListItem[]}
                selectedUid={effectiveUserUid}
                onUidChange={setSelectedUserUid}
                triggerClassName="h-9 w-[180px] shrink-0 sm:min-w-[220px] sm:w-[220px]"
              />
            </>
          ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 bg-white border-gray-200 text-foreground gap-2"
          onClick={() => setSummaryOpen(true)}
        >
          <BarChart3 className="size-4 shrink-0" />
          Summary
        </Button>
      </div>

      <AttendanceHoursSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        userMetrics={summaryUserMetrics}
        isLoading={reportDetailQuery.isLoading}
        periodLabel={periodLabel}
        usersList={usersList}
        branches={branches}
        filteredCheckIns={checkIns}
        dateFrom={dateFrom}
        dateTo={dateTo}
        isRangeLoading={rangeQuery.isLoading || rangeQuery.isFetching}
        payrollData={payrollQuery.data}
        payrollIsLoading={payrollQuery.isLoading}
      />

      {isLoadingMain ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Period averages
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Avg. start time"
                value={avg?.startTime ?? '—'}
                icon={Sunrise}
                iconClassName="text-amber-600"
              />
              <KpiCard
                label="Avg. end time"
                value={avg?.endTime ?? '—'}
                icon={Sunset}
                iconClassName="text-orange-600"
              />
              <KpiCard
                label="Avg. shift time"
                value={
                  avg?.shiftDuration != null ? `${avg.shiftDuration}h` : '—'
                }
                icon={Timer}
                iconClassName="text-sky-600"
              />
              <KpiCard
                label="Avg. break time"
                value={
                  avg?.breakDuration != null ? `${avg.breakDuration}h` : '—'
                }
                icon={Coffee}
                iconClassName="text-amber-600"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Today and punctuality
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="flex min-w-0 flex-col bg-white border-gray-200">
                <CardHeader className="items-center pb-0">
                  <CardTitle>Attendance rate today</CardTitle>
                  <CardDescription>
                    Share of employees present vs total ({todayStr})
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 items-center pb-0">
                  {dailyOverviewLoading ? (
                    <LoadingSpinner wrapperClassName="min-h-[220px] py-8 w-full" />
                  ) : dailyOverviewQuery.isError ? (
                    <p className="text-sm text-destructive text-center w-full px-4 py-12">
                      Could not load today&apos;s attendance rate.{' '}
                      {dailyOverviewQuery.error instanceof Error
                        ? dailyOverviewQuery.error.message
                        : null}
                    </p>
                  ) : (
                    <ChartContainer
                      config={radialConfig}
                      className="mx-auto aspect-square w-full max-w-[280px]"
                    >
                      <RadialBarChart
                        data={radialData}
                        endAngle={180}
                        innerRadius={80}
                        outerRadius={130}
                      >
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <PolarRadiusAxis
                          tick={false}
                          tickLine={false}
                          axisLine={false}
                        >
                          <Label
                            content={({ viewBox }) => {
                              if (
                                viewBox &&
                                'cx' in viewBox &&
                                'cy' in viewBox
                              ) {
                                return (
                                  <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                  >
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) - 16}
                                      className="fill-foreground text-2xl font-bold"
                                    >
                                      {attendanceRateToday}%
                                    </tspan>
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) + 4}
                                      className="fill-muted-foreground"
                                    >
                                      Attendance today
                                    </tspan>
                                  </text>
                                );
                              }
                            }}
                          />
                        </PolarRadiusAxis>
                        <RadialBar
                          name="Present"
                          dataKey="attended"
                          stackId="a"
                          cornerRadius={6}
                          fill="var(--color-attended)"
                          className="stroke-transparent stroke-2"
                        />
                        <RadialBar
                          name="Absent"
                          dataKey="remainder"
                          stackId="a"
                          cornerRadius={6}
                          fill="var(--color-remainder)"
                          className="stroke-transparent stroke-2"
                        />
                        <ChartLegend
                          payload={radialLegendPayload}
                          content={<ChartLegendContent />}
                          verticalAlign="bottom"
                        />
                      </RadialBarChart>
                    </ChartContainer>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-1 text-sm text-muted-foreground">
                  <p>
                    Based on daily overview (present vs total headcount for the
                    org).
                  </p>
                </CardFooter>
              </Card>

              <Card className="min-w-0 bg-white border-gray-200">
                <CardHeader>
                  <CardTitle>Late vs on time</CardTitle>
                  <CardDescription>
                    Check-ins in range with late minutes vs on time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasRangeCheckIns ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No check-ins in this period.
                    </p>
                  ) : (
                    <ReportDonutChart
                      config={pieConfig}
                      data={pieData}
                      centerPrimary={pieCheckInTotal.toLocaleString()}
                      centerSecondary="Check-ins in range"
                      className="max-h-[224px]"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Trends</h2>
            <Card className="min-w-0 bg-white border-gray-200">
              <CardHeader>
                <CardTitle>Daily on-time rate</CardTitle>
                <CardDescription>
                  Percentage of check-ins with no late minutes, by day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasRangeCheckIns ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No check-ins in this period.
                  </p>
                ) : lineData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No daily data.
                  </p>
                ) : (
                  <>
                    <ChartContainer
                      config={lineConfig}
                      className="h-[300px] w-full"
                    >
                      <AreaChart
                        data={lineData}
                        margin={{ left: 12, right: 12, top: 8, bottom: 12 }}
                      >
                        <defs>
                          <linearGradient
                            id="fillOnTimePctDaily"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-onTimePct)"
                              stopOpacity={0.85}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-onTimePct)"
                              stopOpacity={0.12}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(v) => v.slice(5).replace('-', '/')}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          width={36}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const raw = payload[0]?.value;
                            const pct =
                              typeof raw === 'number'
                                ? raw
                                : Number.parseFloat(String(raw));
                            const dateStr =
                              typeof label === 'string'
                                ? label
                                : label != null
                                  ? String(label)
                                  : '';
                            const title =
                              /^\d{4}-\d{2}-\d{2}$/.test(dateStr) &&
                              !Number.isNaN(parseISO(dateStr).getTime())
                                ? format(parseISO(dateStr), 'MMM d')
                                : dateStr;
                            return (
                              <div className="border-border/50 bg-background grid min-w-[10rem] gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                                <div className="font-medium">{title}</div>
                                <div className="flex justify-between gap-4 font-mono tabular-nums">
                                  <span className="text-muted-foreground">
                                    On-time %
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {Number.isFinite(pct)
                                      ? `${pct}%`
                                      : String(raw)}
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ChartLegend
                          content={<ChartLegendContent />}
                          verticalAlign="top"
                        />
                        <Area
                          type="natural"
                          dataKey="onTimePct"
                          name="On-time %"
                          stroke="var(--color-onTimePct)"
                          strokeWidth={2}
                          fill="url(#fillOnTimePctDaily)"
                          dot={(props) => {
                            const { cx, cy, payload, index } = props;
                            const pct = payload?.onTimePct ?? 0;
                            const fill =
                              pct === 100 ? ATT_CHART_HSL.c3 : ATT_CHART_HSL.c1;
                            const dotKey =
                              payload?.date != null
                                ? String(payload.date)
                                : `on-time-${index ?? 0}`;
                            if (cx == null || cy == null)
                              return <g key={dotKey} />;
                            return (
                              <circle
                                key={dotKey}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={fill}
                                stroke="hsl(var(--background))"
                                strokeWidth={1}
                              />
                            );
                          }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ChartContainer>
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-background"
                          style={{ backgroundColor: ATT_CHART_HSL.c3 }}
                        />
                        Max on-time (100%)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-background"
                          style={{ backgroundColor: ATT_CHART_HSL.c1 }}
                        />
                        Below 100%
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Clock-in mix
            </h2>
            <Card className="min-w-0 bg-white border-gray-200">
              <CardHeader>
                <CardTitle>Clock-in mode</CardTitle>
                <CardDescription>
                  Grouped by the clock-in option stored with each shift (same keys
                  as the app: at office, from home, working from home, offsite,
                  driving). Unrecognized or empty notes count as Other.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasRangeCheckIns ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No check-ins in this period.
                  </p>
                ) : barData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No location buckets.
                  </p>
                ) : (
                  <>
                    <ChartContainer
                      config={barConfig}
                      className="h-[260px] w-full"
                    >
                      <BarChart
                        data={barData}
                        margin={{ left: 8, right: 8, top: 20, bottom: 8 }}
                        barCategoryGap="12%"
                        barGap={2}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="location"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          <LabelList
                            dataKey="count"
                            position="top"
                            offset={6}
                            className="fill-foreground text-[11px] font-medium"
                          />
                          {barData.map((row, index) => (
                            <Cell
                              key={`bar-${row.location}-${index}`}
                              fill={row.fill}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1.5 text-[11px] leading-tight">
                      {barData.map((d) => (
                        <span
                          key={d.location}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-sm"
                            style={{
                              backgroundColor: d.fill,
                            }}
                          />
                          {d.location}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <Card
      className={cn(
        'border border-gray-200 bg-white py-4 shadow-none',
        'gap-3'
      )}
    >
      <CardHeader className="pb-1 pt-0 gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('size-5 shrink-0', iconClassName)} aria-hidden />
          <CardDescription className="leading-tight">{label}</CardDescription>
        </div>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
