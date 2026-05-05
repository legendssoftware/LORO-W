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
import { Building2, CalendarIcon, List, User } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { SyncProfile } from '@/api/types';
import type { VisitListItem } from '@/api/types/visits';
import {
  useBranches,
  useCheckIns,
  useLeadsReport,
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
  buildReportingUserUidSet,
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';
import type { TargetsProgressBucketRow } from '@/api/types/targets-progress';
import { ReportsCurrentProgressSection } from '@/app/reports/components/reports-current-progress-section';
import { OverviewDailySummaryDialog } from '@/app/reports/components/overview-daily-summary-dialog';
import {
  buildOverviewDailySummaryRows,
  buildSelfOverviewDailySummaryRow,
  countVisitsByOwnerUid,
  getOverviewSummaryUtcDay,
  mapLeadsByUserFromReport,
} from '@/app/reports/utils/overview-daily-summary';

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

/** Count check-ins whose checkInTime falls in [startDate, endDate] (inclusive), matching /check-ins list API (all contact methods). */
function countCheckInsInBucketWindow(
  checkIns: VisitListItem[],
  startDate: string,
  endDate: string
): number {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  let n = 0;
  for (const c of checkIns) {
    const t = new Date(c.checkInTime).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= startMs && t <= endMs) n += 1;
  }
  return n;
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
      achievedVisits: countCheckInsInBucketWindow(
        checkIns,
        b.startDate,
        b.endDate
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
  const [timeframe, setTimeframe] = React.useState<OverviewTimeframe>('month');
  const [dayPopoverOpen, setDayPopoverOpen] = React.useState(false);
  const [monthPopoverOpen, setMonthPopoverOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => utcToday());
  const [monthAnchor, setMonthAnchor] = React.useState<Date>(() => utcToday());
  const [selectedBranchId, setSelectedBranchId] =
    React.useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] =
    React.useState<string>('all');
  const [summaryDialogOpen, setSummaryDialogOpen] = React.useState(false);

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

  const checkInsParams = React.useMemo(() => {
    const { from, to } =
      timeframe === 'day'
        ? { from: formatUtcYmd(selectedDay), to: formatUtcYmd(selectedDay) }
        : getUtcMonthRange(monthAnchor);
    const startIso = `${from}T00:00:00.000Z`;
    const endIso = `${to}T23:59:59.999Z`;
    return {
      startDate: startIso,
      endDate: endIso,
      ...(reportsMode === 'self' && profile?.uid != null
        ? { userUid: String(profile.uid) }
        : elevated && selectedOwnerUid !== 'all'
          ? { userUid: selectedOwnerUid }
          : {}),
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
    };
  }, [
    timeframe,
    selectedDay,
    monthAnchor,
    reportsMode,
    profile,
    elevated,
    selectedOwnerUid,
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

  React.useEffect(() => {
    if (!elevated || selectedOwnerUid === 'all') return;
    const ok = reportingUsers.some((u) => String(u.uid) === selectedOwnerUid);
    if (!ok) setSelectedOwnerUid('all');
  }, [elevated, reportingUsers, selectedOwnerUid]);

  const checkInsForOverviewCharts = React.useMemo(() => {
    const raw = checkInsData?.checkIns ?? [];
    return filterVisitListItemsByOwnerUids(
      raw,
      reportingUidSet,
      elevated && selectedOwnerUid === 'all'
    );
  }, [
    checkInsData?.checkIns,
    reportingUidSet,
    elevated,
    selectedOwnerUid,
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
      ? `${formatUtcYmd(selectedDay)} (UTC, hourly)`
      : `${getUtcMonthRange(monthAnchor).from} – ${getUtcMonthRange(monthAnchor).to} (UTC, daily)`;

  const totals = React.useMemo(() => {
    const rows = progressData?.aggregateBuckets ?? [];
    const checkIns = checkInsForOverviewCharts;
    const visA = rows.reduce(
      (sum, b) =>
        sum + countCheckInsInBucketWindow(checkIns, b.startDate, b.endDate),
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
  }, [progressData?.aggregateBuckets, checkInsForOverviewCharts]);

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

  const summaryUtcDay = React.useMemo(
    () => getOverviewSummaryUtcDay(timeframe, selectedDay, monthAnchor),
    [timeframe, selectedDay, monthAnchor]
  );
  const summaryYmd = formatUtcYmd(summaryUtcDay);

  const summaryCheckInsParams = React.useMemo(() => {
    const startIso = `${summaryYmd}T00:00:00.000Z`;
    const endIso = `${summaryYmd}T23:59:59.999Z`;
    return {
      startDate: startIso,
      endDate: endIso,
      ...(reportsMode === 'self' && profile?.uid != null
        ? { userUid: String(profile.uid) }
        : elevated && selectedOwnerUid !== 'all'
          ? { userUid: selectedOwnerUid }
          : {}),
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
    };
  }, [
    summaryYmd,
    reportsMode,
    profile?.uid,
    elevated,
    selectedOwnerUid,
    selectedBranchId,
  ]);

  const summaryCheckInsEnabled =
    summaryDialogOpen &&
    Boolean(summaryCheckInsParams.startDate && summaryCheckInsParams.endDate) &&
    (reportsMode !== 'self' || profile?.uid != null);

  const {
    data: summaryCheckInsData,
    isLoading: summaryCheckInsLoading,
    isError: summaryCheckInsIsError,
    error: summaryCheckInsError,
  } = useCheckIns(summaryCheckInsParams, {
    enabled: summaryCheckInsEnabled,
  });

  const summaryLeadsParams = React.useMemo(
    () => ({
      from: summaryYmd,
      to: summaryYmd,
      dateBasis: 'activity' as const,
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(elevated && selectedOwnerUid !== 'all'
        ? { ownerId: Number(selectedOwnerUid) }
        : {}),
    }),
    [summaryYmd, elevated, selectedBranchId, selectedOwnerUid]
  );

  const {
    data: summaryLeadsData,
    isLoading: summaryLeadsLoading,
    isError: summaryLeadsIsError,
    error: summaryLeadsError,
  } = useLeadsReport(summaryLeadsParams, {
    enabled: summaryDialogOpen && Boolean(summaryYmd),
  });

  const summaryProgressParams = React.useMemo(
    () => ({
      from: summaryYmd,
      to: summaryYmd,
      bucket: 'day' as const,
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(elevated && selectedOwnerUid !== 'all'
        ? { userUid: Number(selectedOwnerUid) }
        : {}),
    }),
    [summaryYmd, elevated, selectedBranchId, selectedOwnerUid]
  );

  const { data: summaryProgressData } = useTargetsProgress(summaryProgressParams, {
    enabled: summaryDialogOpen && Boolean(summaryYmd),
  });

  const summaryTableUsers = React.useMemo((): UserListItem[] => {
    if (!elevated) return [];
    if (selectedOwnerUid !== 'all') {
      return usersList.filter((u) => String(u.uid) === selectedOwnerUid);
    }
    return reportingUsers;
  }, [elevated, usersList, selectedOwnerUid, reportingUsers]);

  const branchesByUid = React.useMemo(
    () => new Map(branches.map((b) => [b.uid, b])),
    [branches]
  );

  const summaryTargetsByUid = React.useMemo(
    () =>
      new Map((summaryProgressData?.users ?? []).map((u) => [u.uid, u] as const)),
    [summaryProgressData?.users]
  );

  const summaryCheckInsForTable = React.useMemo(() => {
    const raw = summaryCheckInsData?.checkIns ?? [];
    return filterVisitListItemsByOwnerUids(
      raw,
      reportingUidSet,
      elevated && selectedOwnerUid === 'all'
    );
  }, [
    summaryCheckInsData?.checkIns,
    reportingUidSet,
    elevated,
    selectedOwnerUid,
  ]);

  const summaryRows = React.useMemo(() => {
    const visitsByUid = countVisitsByOwnerUid(summaryCheckInsForTable);
    const leadMap = mapLeadsByUserFromReport(summaryLeadsData?.byUser);
    if (!elevated && profile) {
      return [
        buildSelfOverviewDailySummaryRow(
          profile,
          visitsByUid,
          leadMap,
          branchesByUid,
          summaryTargetsByUid
        ),
      ];
    }
    return buildOverviewDailySummaryRows(
      summaryTableUsers,
      visitsByUid,
      leadMap,
      branchesByUid,
      summaryTargetsByUid
    );
  }, [
    summaryCheckInsForTable,
    summaryLeadsData?.byUser,
    summaryProgressData?.users,
    elevated,
    profile,
    summaryTableUsers,
    branchesByUid,
    summaryTargetsByUid,
  ]);

  const summaryScopeDescription = React.useMemo(() => {
    if (!elevated) return 'Your activity';
    const parts: string[] = [];
    if (selectedBranchId === 'all') {
      parts.push('All branches');
    } else {
      const b = branches.find((x) => String(x.uid) === selectedBranchId);
      parts.push(b ? `Branch: ${getBranchDisplayLabel(b)}` : 'Branch filter');
    }
    if (selectedOwnerUid === 'all') {
      parts.push('All users');
    } else {
      const u =
        usersList.find((x) => String(x.uid) === selectedOwnerUid) ??
        reportingUsers.find((x) => String(x.uid) === selectedOwnerUid);
      parts.push(
        u
          ? `User: ${[u.name, u.surname].filter(Boolean).join(' ')}`
          : 'One user'
      );
    }
    return parts.join(' · ');
  }, [
    elevated,
    selectedBranchId,
    selectedOwnerUid,
    branches,
    reportingUsers,
    usersList,
  ]);

  const summaryLoading =
    summaryDialogOpen && (summaryCheckInsLoading || summaryLeadsLoading);
  const summaryErrorMessage =
    summaryDialogOpen && (summaryCheckInsIsError || summaryLeadsIsError)
      ? (summaryCheckInsError as Error | undefined)?.message ??
        (summaryLeadsError as Error | undefined)?.message ??
        'Failed to load summary'
      : null;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-3">
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
            <Select
              value={timeframe}
              onValueChange={(v) => setTimeframe(v as OverviewTimeframe)}
            >
              <SelectTrigger
                className={cn(
                  selectTriggerClass,
                  'w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]'
                )}
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
                    'h-9 w-[190px] shrink-0 justify-start text-left font-normal sm:w-[220px]',
                    selectTriggerClass
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  {formatUtcYmd(selectedDay)}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[80vw] max-w-sm p-0 sm:w-auto"
                align="center"
              >
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
                    'h-9 w-[210px] shrink-0 justify-start text-left font-normal sm:w-[240px]',
                    selectTriggerClass
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  {format(monthAnchor, 'MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[80vw] max-w-sm p-0 sm:w-auto"
                align="center"
              >
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
                    className={cn(
                      selectTriggerClass,
                      'w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]'
                    )}
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
                    className={cn(
                      selectTriggerClass,
                      'w-[190px] shrink-0 sm:min-w-[220px] sm:w-[220px]'
                    )}
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

            <div className="flex w-[150px] shrink-0 sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                className={cn(selectTriggerClass, 'h-9 w-full shrink-0 sm:w-auto')}
                onClick={() => setSummaryDialogOpen(true)}
              >
                <List className="mr-2 size-4 shrink-0" aria-hidden />
                Summary
              </Button>
            </div>
          </div>
        </div>
      </div>

      <OverviewDailySummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        summaryDateYmd={summaryYmd}
        scopeDescription={summaryScopeDescription}
        rows={summaryRows}
        isLoading={summaryLoading}
        errorMessage={summaryErrorMessage}
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
          <ReportsCurrentProgressSection
            elevated={elevated}
            filterSuffix={filterSuffix}
          />
        </div>
      )}
    </div>
  );
}
