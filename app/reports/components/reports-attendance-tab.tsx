'use client';

import { useMemo, useState, type ComponentType } from 'react';
import {
  format,
  isSameDay,
  startOfDay,
} from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Coffee,
  Sunrise,
  Sunset,
  Timer,
} from 'lucide-react';
import type { SyncProfile } from '@/api/types';
import { AccessLevel } from '@/api/types/user';
import type { AttendanceReportUserMetric } from '@/api/types';
import type { ClockInOptionKey } from '@/api/types/attendance';
import {
  useAttendanceByDateRange,
  useAttendanceReport,
  useBranches,
  useDailyOverview,
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
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/loading-spinner';
import { CalendarIcon, XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { AttendanceHoursSummaryDialog } from '@/app/reports/components/attendance-hours-summary-dialog';

/** Fixed HSL palette for attendance charts (per product spec). */
export const ATT_CHART_HSL = {
  c1: 'hsl(0 72.2% 50.6%)',
  c2: 'hsl(20.5 90.2% 48.2%)',
  c3: 'hsl(142.1 76.2% 36.3%)',
  c4: 'hsl(200.4 98% 39.4%)',
  c5: 'hsl(346.8 77.2% 49.8%)',
} as const;

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

type RangeOwner = {
  uid?: number;
  clerkUserId?: string;
  name?: string;
  surname?: string;
  email?: string;
  accessLevel?: string;
  branch?: { uid?: number; name?: string } | null;
};

type RangeCheckIn = {
  checkIn: string;
  lateMinutes?: number | null;
  checkInNotes?: string | null;
  ownerClerkUserId?: string | null;
  owner?: RangeOwner | null;
};

function isRangeCheckIn(row: unknown): row is RangeCheckIn {
  return (
    typeof row === 'object' &&
    row !== null &&
    'checkIn' in row &&
    typeof (row as RangeCheckIn).checkIn === 'string'
  );
}

function parseCheckIns(rows: unknown[]): RangeCheckIn[] {
  return rows.filter(isRangeCheckIn);
}

function filterCheckIns(
  rows: RangeCheckIn[],
  filters: {
    branchUid: string;
    role: string;
    userUid: string;
    search: string;
  }
): RangeCheckIn[] {
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
}

export function ReportsAttendanceTab({ profile }: ReportsAttendanceTabProps) {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [endDate, setEndDate] = useState(() => startOfDay(new Date()));
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUserUid, setSelectedUserUid] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);

  const dateFrom = format(startDate, 'yyyy-MM-dd');
  const dateTo = format(endDate, 'yyyy-MM-dd');

  const orgId = profile?.organisationRef ?? undefined;

  const reportParamsBase = {
    dateFrom,
    dateTo,
    includeUserDetails: false as const,
    branchId:
      selectedBranchId !== 'all' ? selectedBranchId : undefined,
    role:
      selectedRole !== 'all'
        ? (selectedRole as (typeof ROLE_OPTIONS)[number])
        : undefined,
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
  const { data: usersList = [] } = useUsers({ limit: 200 });

  const rawCheckIns = useMemo(
    () => parseCheckIns(rangeQuery.data?.checkIns ?? []),
    [rangeQuery.data?.checkIns]
  );

  const filterState = useMemo(
    () => ({
      branchUid: selectedBranchId,
      role: selectedRole,
      userUid: selectedUserUid,
      search: searchQuery,
    }),
    [selectedBranchId, selectedRole, selectedUserUid, searchQuery]
  );

  const checkIns = useMemo(
    () => filterCheckIns(rawCheckIns, filterState),
    [rawCheckIns, filterState]
  );

  const summaryUserMetrics = useMemo(() => {
    const rows = reportDetailQuery.data?.report.userMetrics ?? [];
    return filterUserMetricsForSummary(rows, {
      userUid: selectedUserUid,
      search: searchQuery,
    });
  }, [
    reportDetailQuery.data?.report.userMetrics,
    selectedUserUid,
    searchQuery,
  ]);

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
      { name: 'onTime' as const, value: onTime, fill: 'var(--color-onTime)' },
      { name: 'late' as const, value: late, fill: 'var(--color-late)' },
    ];
  }, [checkIns]);

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
    reportQuery.isLoading ||
    rangeQuery.isLoading ||
    dailyOverviewQuery.isLoading;

  const hasRangeCheckIns = checkIns.length > 0;

  const periodLabel = `${dateFrom} – ${dateTo}`;
  const isDefaultRange =
    isSameDay(startDate, today) && isSameDay(endDate, today);

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0">
            <Popover
              open={dateRangePopoverOpen}
              onOpenChange={setDateRangePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[140px] bg-white border-gray-200 text-foreground justify-center gap-2"
                >
                  <CalendarIcon className="size-4" />
                  {startDate.getTime() === endDate.getTime()
                    ? format(startDate, 'MMM d, yyyy')
                    : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[480px] p-0 z-[10001]"
                align="start"
              >
                <div className="p-2 flex flex-col gap-3">
                  <div className="flex flex-row gap-6">
                    <div>
                      <p className="text-sm font-medium">Start date</p>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (d) setStartDate(d);
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">End date</p>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          if (d) setEndDate(d);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {!isDefaultRange ? (
              <button
                type="button"
                onClick={() => {
                  const d = startOfDay(new Date());
                  setStartDate(d);
                  setEndDate(d);
                }}
                className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                aria-label="Reset date range"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>

          <Select
            value={selectedBranchId}
            onValueChange={setSelectedBranchId}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.uid} value={String(b.uid)}>
                  {b.name ?? `Branch ${b.uid}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUserUid} onValueChange={setSelectedUserUid}>
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All users</SelectItem>
              {usersList.map((u) => {
                const fullName =
                  [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                  u.email ||
                  `User ${u.uid}`;
                return (
                  <SelectItem key={u.uid} value={String(u.uid)}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-6 shrink-0">
                        <AvatarImage src={undefined} alt="" />
                        <AvatarFallback className="text-xs">
                          {fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {fullName}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-nowrap items-center gap-2 min-w-0">
          <div className="relative w-56 min-w-0 shrink sm:w-64">
            <Input
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full bg-white border-gray-200 text-foreground h-9',
                searchQuery && 'pr-8'
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 text-red-600"
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 bg-white border-gray-200 text-foreground gap-2 shrink-0"
            onClick={() => setSummaryOpen(true)}
          >
            <BarChart3 className="size-4" />
            Summary
          </Button>
        </div>
      </div>

      <AttendanceHoursSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        userMetrics={summaryUserMetrics}
        isLoading={reportDetailQuery.isLoading}
        periodLabel={periodLabel}
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
              <Card className="flex flex-col bg-white border-gray-200">
                <CardHeader className="items-center pb-0">
                  <CardTitle>Attendance rate today</CardTitle>
                  <CardDescription>
                    Share of employees present vs total ({todayStr})
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 items-center pb-0">
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
                </CardContent>
                <CardFooter className="flex-col gap-1 text-sm text-muted-foreground">
                  <p>
                    Based on daily overview (present vs total headcount for the
                    org).
                  </p>
                </CardFooter>
              </Card>

              <Card className="bg-white border-gray-200">
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
                    <ChartContainer
                      config={pieConfig}
                      className="mx-auto aspect-square max-h-[280px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          strokeWidth={2}
                          paddingAngle={2}
                          cornerRadius={6}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend
                          content={<ChartLegendContent nameKey="name" />}
                          verticalAlign="bottom"
                        />
                      </PieChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Trends</h2>
            <Card className="bg-white border-gray-200">
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
                      <LineChart
                        data={lineData}
                        margin={{ left: 12, right: 12, top: 8, bottom: 12 }}
                      >
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
                          content={
                            <ChartTooltipContent
                              labelFormatter={(label) =>
                                typeof label === 'string'
                                  ? label
                                  : String(label)
                              }
                            />
                          }
                        />
                        <ChartLegend
                          content={<ChartLegendContent />}
                          verticalAlign="top"
                        />
                        <Line
                          type="monotone"
                          dataKey="onTimePct"
                          name="On-time %"
                          stroke="var(--color-onTimePct)"
                          strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            const pct = payload?.onTimePct ?? 0;
                            const fill =
                              pct === 100 ? ATT_CHART_HSL.c3 : ATT_CHART_HSL.c1;
                            if (cx == null || cy == null) return <g />;
                            return (
                              <circle
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
                      </LineChart>
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
            <Card className="bg-white border-gray-200">
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
                      className="h-[300px] w-full"
                    >
                      <BarChart
                        data={barData}
                        margin={{ left: 12, right: 12, top: 28, bottom: 12 }}
                        barCategoryGap="20%"
                        barGap={4}
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
                    <div className="flex flex-wrap justify-center gap-4 pt-2">
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
