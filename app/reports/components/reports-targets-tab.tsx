'use client';

import { useMemo, useState } from 'react';
import { format, startOfDay, startOfMonth } from 'date-fns';
import { AlertTriangle, CalendarIcon, Target, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { SyncProfile } from '@/api/types';
import type { TargetsProgressBucket, TargetsProgressUserSummary } from '@/api/types/targets-progress';
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

type TargetMetric = 'calls' | 'visits' | 'leads';

function defaultRange(): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  return { start: startOfMonth(today), end: today };
}

function metricLabels(m: TargetMetric): { target: string; achieved: string } {
  if (m === 'calls') return { target: 'Call target', achieved: 'Calls made' };
  if (m === 'visits') return { target: 'Visit target', achieved: 'Visits' };
  return { target: 'Lead target', achieved: 'Leads' };
}

function rowBelowMetric(u: TargetsProgressUserSummary, m: TargetMetric): boolean {
  if (m === 'calls') return u.belowCumulativeCalls;
  if (m === 'visits') return u.belowCumulativeVisits;
  return u.belowCumulativeLeads;
}

function rowShortfall(u: TargetsProgressUserSummary, m: TargetMetric): number {
  if (m === 'calls') return u.shortfallCalls;
  if (m === 'visits') return u.shortfallVisits;
  return u.shortfallLeads;
}

export interface ReportsTargetsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsTargetsTab({ profile, reportsMode }: ReportsTargetsTabProps) {
  const [{ start: rangeStart, end: rangeEnd }, setRange] = useState(defaultRange);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [bucket, setBucket] = useState<TargetsProgressBucket>('week');
  const [metric, setMetric] = useState<TargetMetric>('calls');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');
  const [onlyBehind, setOnlyBehind] = useState(false);

  const dateFrom = format(rangeStart, 'yyyy-MM-dd');
  const dateTo = format(rangeEnd, 'yyyy-MM-dd');
  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  const progressParams = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
      bucket,
      ...(elevated && selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(elevated && selectedOwnerUid !== 'all'
        ? { userUid: Number(selectedOwnerUid) }
        : {}),
    }),
    [
      dateFrom,
      dateTo,
      bucket,
      elevated,
      selectedBranchId,
      selectedOwnerUid,
    ]
  );

  const { data, isLoading, isError, error } = useTargetsProgress(progressParams, {
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

  const ml = metricLabels(metric);

  const chartConfig = useMemo(
    () =>
      ({
        target: {
          label: ml.target,
          color: 'var(--chart-1)',
        },
        achieved: {
          label: ml.achieved,
          color: 'var(--chart-2)',
        },
      }) satisfies ChartConfig,
    [ml.target, ml.achieved]
  );

  const chartData = useMemo(() => {
    const rows = data?.aggregateBuckets ?? [];
    return rows.map((b) => {
      let target = 0;
      let achieved = 0;
      if (metric === 'calls') {
        target = b.targetCalls;
        achieved = b.achievedCalls;
      } else if (metric === 'visits') {
        target = b.targetVisits;
        achieved = b.achievedVisits;
      } else {
        target = b.targetLeads;
        achieved = b.achievedLeads;
      }
      return {
        label: b.label.length > 14 ? b.key : b.label,
        fullLabel: b.label,
        target,
        achieved,
      };
    });
  }, [data?.aggregateBuckets, metric]);

  const tableUsers = useMemo(() => {
    const list = data?.users ?? [];
    if (!onlyBehind) return list;
    return list.filter((u) => rowBelowMetric(u, metric));
  }, [data?.users, onlyBehind, metric]);

  const behindCount = useMemo(() => {
    return (data?.users ?? []).filter((u) => rowBelowMetric(u, metric)).length;
  }, [data?.users, metric]);

  function downloadShortfallCsv() {
    const users = (data?.users ?? []).filter((u) => rowBelowMetric(u, metric));
    const headers = [
      'UID',
      'Name',
      'Surname',
      'Has target',
      'Period target (calls)',
      'Period target (visits)',
      'Period target (leads)',
      'Achieved calls',
      'Achieved visits',
      'Achieved leads',
      'Shortfall calls',
      'Shortfall visits',
      'Shortfall leads',
      'Behind on calls',
      'Behind on visits',
      'Behind on leads',
    ];
    const rows = users.map((u) => [
      String(u.uid),
      u.name,
      u.surname,
      u.hasTarget ? 'yes' : 'no',
      String(u.periodTargetCalls),
      String(u.periodTargetVisits),
      String(u.periodTargetLeads),
      String(u.achievedCallsInRange),
      String(u.achievedVisitsInRange),
      String(u.achievedLeadsInRange),
      String(u.shortfallCalls),
      String(u.shortfallVisits),
      String(u.shortfallLeads),
      u.belowCumulativeCalls ? 'yes' : 'no',
      u.belowCumulativeVisits ? 'yes' : 'no',
      u.belowCumulativeLeads ? 'yes' : 'no',
    ]);
    exportToCsv(
      headers,
      rows,
      `targets-shortfall-${dateFrom}-${dateTo}`
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal sm:w-[260px]'
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
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
            <div className="flex justify-end gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRange(defaultRange())}
              >
                This month
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

        <Select
          value={bucket}
          onValueChange={(v) => setBucket(v as TargetsProgressBucket)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Bucket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="fortnight">Fortnight</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metric} onValueChange={(v) => setMetric(v as TargetMetric)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calls">Calls</SelectItem>
            <SelectItem value="visits">Visits</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
          </SelectContent>
        </Select>

        {elevated ? (
          <>
            <Select
              value={selectedBranchId}
              onValueChange={(v) => {
                setSelectedBranchId(v);
                setSelectedOwnerUid('all');
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
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

            <Select
              value={selectedOwnerUid}
              onValueChange={setSelectedOwnerUid}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
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
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={!data?.users?.length}
          onClick={() => downloadShortfallCsv()}
        >
          Export CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Targets are prorated by weekday across each user&apos;s target period (intersected with
        this date range). Achieved counts come from check-ins (physical = visits, other = calls)
        and leads created in range. External ERP adjustments to targets aren&apos;t shown here.
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
                  Target vs achieved
                </CardTitle>
                <CardDescription>
                  {ml.target} and {ml.achieved} by {bucket} ({dateFrom} – {dateTo})
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-0">
                {chartData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 px-6">
                    No buckets in this range.
                  </p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[320px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
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
                      <Bar
                        dataKey="target"
                        fill="var(--color-target)"
                        radius={4}
                      />
                      <Bar
                        dataKey="achieved"
                        fill="var(--color-achieved)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Users className="size-4" aria-hidden />
                  {data?.users.length ?? 0} user(s) in scope
                  {elevated && behindCount > 0 ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      · {behindCount} behind on {metric}
                    </span>
                  ) : null}
                </div>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
                <CardDescription>End-of-range cumulative (org aggregate)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(() => {
                  const b = data?.aggregateBuckets ?? [];
                  const last = b[b.length - 1];
                  if (!last) {
                    return (
                      <p className="text-muted-foreground">No data for this range.</p>
                    );
                  }
                  return (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Calls</span>
                        <span className="tabular-nums">
                          {last.cumulativeAchievedCalls} /{' '}
                          {last.cumulativeTargetCalls}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Visits</span>
                        <span className="tabular-nums">
                          {last.cumulativeAchievedVisits} /{' '}
                          {last.cumulativeTargetVisits}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Leads</span>
                        <span className="tabular-nums">
                          {last.cumulativeAchievedLeads} /{' '}
                          {last.cumulativeTargetLeads}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" aria-hidden />
                Shortfall list (HR)
              </h2>
              <div className="flex items-center gap-2">
                <Switch
                  id="only-behind"
                  checked={onlyBehind}
                  onCheckedChange={setOnlyBehind}
                />
                <Label htmlFor="only-behind" className="text-sm cursor-pointer">
                  Only users behind target ({metric})
                </Label>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Target ({metric})</TableHead>
                    <TableHead className="text-right">Achieved</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead className="text-right">Behind</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No rows for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableUsers.map((u) => {
                      let targetEnd = 0;
                      let achieved = 0;
                      if (metric === 'calls') {
                        targetEnd = u.cumulativeTargetCallsEnd;
                        achieved = u.achievedCallsInRange;
                      } else if (metric === 'visits') {
                        targetEnd = u.cumulativeTargetVisitsEnd;
                        achieved = u.achievedVisitsInRange;
                      } else {
                        targetEnd = u.cumulativeTargetLeadsEnd;
                        achieved = u.achievedLeadsInRange;
                      }
                      const sh = rowShortfall(u, metric);
                      const behind = rowBelowMetric(u, metric);
                      return (
                        <TableRow key={u.uid}>
                          <TableCell className="font-medium">
                            {[u.name, u.surname].filter(Boolean).join(' ')}
                            {!u.hasTarget ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (no target set)
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {targetEnd}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {achieved}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {u.hasTarget ? sh : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {u.hasTarget ? (behind ? 'Yes' : 'No') : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
