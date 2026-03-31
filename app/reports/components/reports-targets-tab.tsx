'use client';

import * as React from 'react';
import { format, startOfDay } from 'date-fns';
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
import type { ChartConfig } from '@/components/ui/chart';
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
import { userListItemHasPerformanceTarget } from '@/app/reports/utils/user-has-performance-target';
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

/** Map local calendar picker dates to UTC `yyyy-MM-dd` for the API (same idea as Overview). */
function localDateToUtcYmd(d: Date): string {
  return formatUtcYmd(
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  );
}

export interface ReportsTargetsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsTargetsTab({ profile, reportsMode }: ReportsTargetsTabProps) {
  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const [{ start: rangeStart, end: rangeEnd }, setRange] = React.useState(
    defaultRange
  );
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedBranchId, setSelectedBranchId] =
    React.useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] =
    React.useState<string>('all');

  const dateFrom = localDateToUtcYmd(rangeStart);
  const dateTo = localDateToUtcYmd(rangeEnd);

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

  const chartProgressParams = React.useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
      bucket: 'day' as const,
      ...filterSuffix,
    }),
    [dateFrom, dateTo, filterSuffix]
  );

  const {
    data: chartData,
    isLoading: chartLoading,
    isError: chartIsError,
    error: chartError,
  } = useTargetsProgress(chartProgressParams, {
    enabled: Boolean(dateFrom && dateTo),
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

  const checkInsDonutSlices = React.useMemo(
    () => recordToDonutSlices(mergeBucketCounts(chartData?.aggregateBuckets)),
    [chartData?.aggregateBuckets]
  );
  const leadsDonutSlices = React.useMemo(
    () => recordToDonutSlices(mergeLeadSources(chartData?.aggregateBuckets)),
    [chartData?.aggregateBuckets]
  );
  const checkInsDonutConfig = React.useMemo(
    () => slicesToChartConfig(checkInsDonutSlices),
    [checkInsDonutSlices]
  );
  const leadsDonutConfig = React.useMemo(
    () => slicesToChartConfig(leadsDonutSlices),
    [leadsDonutSlices]
  );
  const checkInsDonutTotal = React.useMemo(
    () => checkInsDonutSlices.reduce((s, x) => s + x.value, 0),
    [checkInsDonutSlices]
  );
  const leadsDonutTotal = React.useMemo(
    () => leadsDonutSlices.reduce((s, x) => s + x.value, 0),
    [leadsDonutSlices]
  );

  const summarySubtitle = React.useMemo(() => {
    if (!elevated) return 'End-of-range cumulative (your progress)';
    if (selectedOwnerUid !== 'all') return 'End-of-range cumulative (selected user)';
    return 'End-of-range cumulative (org aggregate)';
  }, [elevated, selectedOwnerUid]);

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
      </div>

      {chartLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : chartIsError ? (
        <p className="text-center text-destructive py-8">
          {(chartError as Error)?.message ?? 'Failed to load targets progress'}
        </p>
      ) : (
        <>
          <div className="grid gap-4">
            <Card className="border border-gray-200 bg-white shadow-sm max-w-xl">
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
                  function row(label: string, target: number, achieved: number) {
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
                        last.cumulativeAchievedCalls + last.cumulativeAchievedVisits
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
        </>
      )}
    </div>
  );
}
