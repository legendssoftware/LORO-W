'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { getTaskPlanningReport } from '@/api/endpoints/reports-task-planning';
import {
  useApiClient,
  useBranches,
  useSessionSync,
  useTokenReady,
  useUser,
} from '@/api/hooks';
import type { TaskPlanningUserRow } from '@/api/types/reports-task-planning';
import { ReportDonutChart, type ReportDonutSlice } from '@/components/charts/report-donut-chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getReportsDataScope } from '@/lib/access';
import { utcMonthStartThroughToday } from '@/lib/utils/overview-daily-summary';
import { cn } from '@/lib/utils';
import {
  fetchReportsOrgUsers,
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
} from '../lib/reports-scope-allowlist';
import { useReportsDateRange } from '../lib/use-reports-date-range';
import {
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
  toNamedBars,
} from '../lib/reports-dashboard-chart-helpers';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsNamedBarChart } from './reports-named-bar-chart';
import { ReportsCallQualityRateRadial } from './reports-call-quality-rate-radial';

type SortKey = 'name' | 'planned' | 'done' | 'accomplishmentPct' | 'jobMinutesTotal';
type SortDir = 'asc' | 'desc';

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value}%`;
}

function formatJobMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function compareRows(a: TaskPlanningUserRow, b: TaskPlanningUserRow, key: SortKey): number {
  if (key === 'name') return a.name.localeCompare(b.name);
  return a[key] - b[key];
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 text-xs font-medium"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <Icon className="size-3.5" aria-hidden />
    </Button>
  );
}

export function ReportsTasksTab() {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(backendUserData?.accessLevel, backendUserData);
  const isMultiUser = scope !== 'self';
  const selfRef =
    backendUserData?.clerkUserId?.trim() ||
    (backendUserData?.uid != null ? String(backendUserData.uid) : null);

  const mtdDefault = useMemo(() => utcMonthStartThroughToday(), []);
  const { startDate, endDate, from, to, setRange } = useReportsDateRange(mtdDefault.start, mtdDefault.end);
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('planned');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const branchIdFilter =
    isMultiUser && branchFilter !== 'all' && Number.isFinite(Number(branchFilter))
      ? Number(branchFilter)
      : null;
  const userIdFilter = useMemo(() => {
    if (!isMultiUser) {
      return backendUserData?.uid != null && Number.isFinite(backendUserData.uid)
        ? Number(backendUserData.uid)
        : null;
    }
    if (userFilter !== 'all' && Number.isFinite(Number(userFilter))) {
      return Number(userFilter);
    }
    return null;
  }, [isMultiUser, backendUserData?.uid, userFilter]);

  const selfProfileQuery = useUser(selfRef, {
    enabled: isTokenReady && scope === 'team' && !!selfRef,
    includeAssignedClients: false,
  });

  const allowlistUids = useMemo(
    () =>
      resolveReportsAllowlistUids({
        scope,
        selfUid: backendUserData?.uid,
        managedStaff: selfProfileQuery.data?.managedStaff,
        managedBranches: backendUserData?.managedBranches,
      }),
    [scope, backendUserData?.uid, backendUserData?.managedBranches, selfProfileQuery.data?.managedStaff],
  );

  const branchesQuery = useBranches({ enabled: isTokenReady && isMultiUser });
  const usersQuery = useQuery({
    queryKey: [...REPORTS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchReportsOrgUsers(client),
    enabled: isTokenReady && isMultiUser,
    staleTime: 5 * 60 * 1000,
  });

  const allowlistedUsers = useMemo(
    () => (usersQuery.data ?? []).filter((user) => userUidInAllowlist(user.uid, allowlistUids)),
    [usersQuery.data, allowlistUids],
  );

  const reportParams = useMemo(
    () => ({
      from,
      to,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
      ...(userIdFilter != null ? { userUid: userIdFilter } : {}),
    }),
    [from, to, branchIdFilter, userIdFilter],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'task-planning', reportParams],
    queryFn: () => getTaskPlanningReport(client, reportParams),
    enabled: isTokenReady,
    staleTime: 5 * 60 * 1000,
  });

  const missedDonut = useMemo(() => {
    const slices: ReportDonutSlice[] = [
      { id: 'visited', label: 'Visited', value: data?.totals.visited ?? 0, fill: REPORTS_CHART_GREEN },
      { id: 'missed', label: 'Missed', value: data?.totals.missed ?? 0, fill: REPORTS_CHART_RED },
    ].filter((slice) => slice.value > 0);
    const config: ChartConfig = {};
    for (const slice of slices) {
      config[slice.id] = { label: slice.label, color: slice.fill };
    }
    return {
      slices,
      config,
      total: slices.reduce((sum, slice) => sum + slice.value, 0),
    };
  }, [data?.totals.missed, data?.totals.visited]);
  const plannedBars = useMemo(() => toNamedBars(data?.plannedVsDone, 2), [data?.plannedVsDone]);
  const plannedPerUser = useMemo(
    () =>
      (data?.byUser ?? [])
        .filter((row) => row.planned > 0)
        .slice(0, 12)
        .map((row) => ({ name: row.name, value: row.planned })),
    [data?.byUser],
  );

  const sortedUsers = useMemo(() => {
    const rows = [...(data?.byUser ?? [])];
    rows.sort((a, b) => {
      const cmp = compareRows(a, b, sortKey);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [data?.byUser, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'desc');
  }

  if (!isTokenReady || isLoading) {
    return (
      <div className="space-y-4" data-tour="reports-tasks-tab">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-3" data-tour="reports-tasks-tab">
        <p className="text-sm text-destructive">Could not load tasks and planning.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const totals = data.totals;
  const visitRate = totals.planned > 0 ? totals.visitAccomplishmentPct : null;
  const taskRate = totals.tasksPlanned > 0 ? totals.taskAccomplishmentPct : null;

  return (
    <div className="space-y-5 pb-8" data-tour="reports-tasks-tab">
      <ReportsDashboardToolbar
        startDate={startDate}
        endDate={endDate}
        onRangeChange={setRange}
        showDimensionFilters={isMultiUser}
        branches={branchesQuery.data}
        users={allowlistedUsers}
        selectedBranchId={branchFilter}
        onBranchChange={setBranchFilter}
        selectedUserId={userFilter}
        onUserChange={setUserFilter}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Planned visits" value={totals.planned.toLocaleString()} sub="Visit plans in this period" />
        <SummaryStat label="Done visits" value={totals.done.toLocaleString()} sub="Marked completed" />
        <SummaryStat label="Visited" value={totals.visited.toLocaleString()} sub="Completed after the visit was due" />
        <SummaryStat label="Missed" value={totals.missed.toLocaleString()} sub="Due visits that were not completed" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center px-2 py-4">
            <ReportsCallQualityRateRadial
              rate={visitRate}
              label="Visit accomplishment"
              passedLabel="Done"
              failedLabel="Not done"
            />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center px-2 py-4">
            <ReportsCallQualityRateRadial
              rate={taskRate}
              label="Task accomplishment"
              passedLabel="Completed"
              failedLabel="Open"
            />
          </CardContent>
        </Card>
        <SummaryStat
          label="Time at a job"
          value={formatJobMinutes(totals.jobMinutesTotal)}
          sub={
            totals.jobsTimed > 0
              ? `${formatJobMinutes(totals.jobMinutesAverage)} average across ${totals.jobsTimed.toLocaleString()} completed jobs`
              : 'No completed jobs with a recorded duration'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportsChartCard title="Missed vs visited" description="Visit plans whose deadline has already passed">
          {missedDonut.total > 0 ? (
            <ReportDonutChart
              config={missedDonut.config}
              data={missedDonut.slices}
              centerPrimary={missedDonut.total.toLocaleString()}
              centerSecondary="Due visits"
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No due visits in this period.</p>
          )}
        </ReportsChartCard>
        <ReportsChartCard title="Planned visits vs done visits" description="All visit plans in the period, including ones still ahead">
          <ReportsNamedBarChart
            data={plannedBars}
            fill={REPORTS_CHART_BLUE}
            yAxisLabel="Visits"
            seriesLabel="Visits"
          />
        </ReportsChartCard>
      </div>

      <ReportsChartCard title="Planned per person" description="Visit plans assigned in this period">
        <ReportsNamedBarChart
          data={plannedPerUser}
          fill={REPORTS_CHART_GREEN}
          yAxisLabel="Planned visits"
          seriesLabel="Planned visits"
          heightClassName="h-[300px]"
        />
      </ReportsChartCard>

      <Card className="shadow-sm">
        <CardContent className="px-0 pb-2 pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-3 pl-4">
                  <SortHeader label="Person" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="py-3">
                  <SortHeader label="Planned" sortKey="planned" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="py-3">
                  <SortHeader label="Done" sortKey="done" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                </TableHead>
                <TableHead className="py-3">Missed</TableHead>
                <TableHead className="py-3">Visited</TableHead>
                <TableHead className="py-3">
                  <SortHeader
                    label="Accomplishment"
                    sortKey="accomplishmentPct"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="py-3 pr-4">
                  <SortHeader
                    label="Time at a job"
                    sortKey="jobMinutesTotal"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No assigned tasks in this period.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((row) => (
                  <TableRow key={row.userUid}>
                    <TableCell className="py-3 pl-4 font-medium">{row.name}</TableCell>
                    <TableCell className="py-3 tabular-nums">{row.planned.toLocaleString()}</TableCell>
                    <TableCell className="py-3 tabular-nums">{row.done.toLocaleString()}</TableCell>
                    <TableCell className="py-3 tabular-nums">{row.missed.toLocaleString()}</TableCell>
                    <TableCell className="py-3 tabular-nums">{row.visited.toLocaleString()}</TableCell>
                    <TableCell className="py-3 tabular-nums">{formatPct(row.accomplishmentPct)}</TableCell>
                    <TableCell className={cn('py-3 pr-4 tabular-nums')}>
                      {formatJobMinutes(row.jobMinutesTotal)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        avg {formatJobMinutes(row.jobMinutesAverage)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
