'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { getLeadActivityReport } from '@/api/endpoints/reports-lead-activity';
import {
  useApiClient,
  useBranches,
  useSessionSync,
  useTokenReady,
  useUser,
} from '@/api/hooks';
import type { LeadActivityCounts, LeadActivityUserRow } from '@/api/types/reports-lead-activity';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getReportsDataScope } from '@/lib/access';
import { utcMonthStartThroughToday } from '@/lib/utils/overview-daily-summary';
import {
  fetchReportsOrgUsers,
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
} from '../lib/reports-scope-allowlist';
import { useReportsDateRange } from '../lib/use-reports-date-range';
import {
  LEAD_ACTIVITY_BUCKETS,
  leadActivityBucketValue,
  type LeadActivityBucketKey,
} from '../lib/lead-activity-buckets';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsStackedBarChart } from './reports-stacked-bar-chart';

type BookView = 'period' | 'lifetime';
type SortKey = 'name' | 'periodTotal' | 'lifetimeTotal' | LeadActivityBucketKey;
type SortDir = 'asc' | 'desc';

const CHART_USER_LIMIT = 15;

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
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

function bookLabel(view: BookView): string {
  return view === 'period' ? 'This period' : 'Lifetime';
}

function bookDescription(view: BookView): string {
  if (view === 'period') {
    return 'Leads imported in this date range. Status is where each lead stands now.';
  }
  return 'Every imported lead they still own. Status is where each lead stands now.';
}

function emptyBookCopy(view: BookView): string {
  if (view === 'period') return 'No leads were imported in this date range.';
  return 'No imported leads for this selection.';
}

function activeBook(row: LeadActivityUserRow, view: BookView): LeadActivityCounts {
  return view === 'period' ? row.period : row.lifetime;
}

function compareRows(a: LeadActivityUserRow, b: LeadActivityUserRow, key: SortKey): number {
  if (key === 'name') return a.name.localeCompare(b.name);
  if (key === 'periodTotal') return a.period.total - b.period.total;
  if (key === 'lifetimeTotal') return a.lifetime.total - b.lifetime.total;
  return leadActivityBucketValue(a.period, key) - leadActivityBucketValue(b.period, key);
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

export function ReportsLeadsActivityTab() {
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
  const [view, setView] = useState<BookView>('period');
  const [sortKey, setSortKey] = useState<SortKey>('periodTotal');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const branchIdFilter =
    isMultiUser && branchFilter !== 'all' && Number.isFinite(Number(branchFilter))
      ? Number(branchFilter)
      : null;
  const selfUid =
    backendUserData?.uid != null && Number.isFinite(backendUserData.uid) ? Number(backendUserData.uid) : null;
  const userIdFilter = !isMultiUser
    ? selfUid
    : userFilter !== 'all' && Number.isFinite(Number(userFilter))
      ? Number(userFilter)
      : null;

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
    queryKey: ['reports', 'lead-activity', reportParams],
    queryFn: () => getLeadActivityReport(client, reportParams),
    enabled: isTokenReady,
    staleTime: 60_000,
  });

  const counts = view === 'period' ? data?.period : data?.lifetime;
  const statusMix = useMemo(() => {
    const slices: ReportDonutSlice[] = LEAD_ACTIVITY_BUCKETS.map((bucket) => ({
      id: bucket.key,
      label: bucket.label,
      value: counts ? leadActivityBucketValue(counts, bucket.key) : 0,
      fill: bucket.color,
    })).filter((slice) => slice.value > 0);
    const config: ChartConfig = {};
    for (const slice of slices) {
      config[slice.id] = { label: slice.label, color: slice.fill };
    }
    return {
      slices,
      config,
      total: slices.reduce((sum, slice) => sum + slice.value, 0),
    };
  }, [counts]);

  const stackedSeries = useMemo(
    () => LEAD_ACTIVITY_BUCKETS.map((bucket) => ({ key: bucket.key, label: bucket.label, color: bucket.color })),
    [],
  );

  const stackedBars = useMemo(() => {
    const rows = [...(data?.users ?? [])]
      .map((user) => ({ user, book: activeBook(user, view) }))
      .filter((row) => row.book.total > 0)
      .sort((a, b) => b.book.total - a.book.total)
      .slice(0, CHART_USER_LIMIT);
    return rows.map(({ user, book }) => {
      const point: Record<string, string | number> = { name: user.name };
      for (const bucket of LEAD_ACTIVITY_BUCKETS) {
        point[bucket.key] = leadActivityBucketValue(book, bucket.key);
      }
      return point;
    });
  }, [data?.users, view]);

  const sortedUsers = useMemo(() => {
    const rows = [...(data?.users ?? [])];
    rows.sort((a, b) => {
      const cmp = compareRows(a, b, sortKey);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [data?.users, sortKey, sortDir]);

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
      <div className="space-y-4" data-tour="reports-leads-activity-tab">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data || !counts) {
    return (
      <div className="space-y-3" data-tour="reports-leads-activity-tab">
        <p className="text-sm text-destructive">Could not load lead activity.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const peopleInView = data.users.filter((user) => activeBook(user, view).total > 0).length;
  const chartDescription =
    peopleInView > CHART_USER_LIMIT
      ? `${bookDescription(view)} Top ${CHART_USER_LIMIT} people by imported leads.`
      : bookDescription(view);

  return (
    <div className="space-y-5 pb-8" data-tour="reports-leads-activity-tab">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => {
            if (value === 'period' || value === 'lifetime') setView(value);
          }}
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-label="Lead book"
        >
          <ToggleGroupItem value="period" className="px-3">
            This period
          </ToggleGroupItem>
          <ToggleGroupItem value="lifetime" className="px-3">
            Lifetime
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryStat label="Imported" value={counts.total.toLocaleString()} sub={bookLabel(view)} />
        <SummaryStat
          label="Untouched"
          value={counts.untouched.toLocaleString()}
          sub="Still pending, and nobody has worked them"
        />
        <SummaryStat
          label="Worked"
          value={counts.touched.toLocaleString()}
          sub="Worked since import, including discarded and deleted"
        />
        <SummaryStat label="Discarded" value={counts.discarded.toLocaleString()} />
        <SummaryStat label="Deleted" value={counts.deleted.toLocaleString()} />
        <SummaryStat label="Converted" value={counts.converted.toLocaleString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportsChartCard title="Status mix" description={bookDescription(view)}>
          {statusMix.total > 0 ? (
            <ReportDonutChart
              config={statusMix.config}
              data={statusMix.slices}
              centerPrimary={statusMix.total.toLocaleString()}
              centerSecondary="Imported"
              legendMaxItems={LEAD_ACTIVITY_BUCKETS.length}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{emptyBookCopy(view)}</p>
          )}
        </ReportsChartCard>
        <div className="lg:col-span-2">
          <ReportsChartCard title="By person" description={chartDescription}>
            {stackedBars.length > 0 ? (
              <ReportsStackedBarChart
                data={stackedBars}
                categoryKey="name"
                series={stackedSeries}
                yAxisLabel="Leads"
                heightClassName="h-[320px]"
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{emptyBookCopy(view)}</p>
            )}
          </ReportsChartCard>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="px-0 pb-2 pt-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 pl-4">
                    <SortHeader label="Person" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="py-3">
                    <SortHeader
                      label="This period"
                      sortKey="periodTotal"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="py-3">
                    <SortHeader
                      label="Lifetime"
                      sortKey="lifetimeTotal"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {LEAD_ACTIVITY_BUCKETS.map((bucket) => (
                    <TableHead key={bucket.key} className="py-3">
                      <SortHeader
                        label={bucket.label}
                        sortKey={bucket.key}
                        activeKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3 + LEAD_ACTIVITY_BUCKETS.length}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No imported leads for this selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((row, index) => (
                    <TableRow key={`${row.userId}-${index}`}>
                      <TableCell className="py-3 pl-4 font-medium">{row.name}</TableCell>
                      <TableCell className="py-3 tabular-nums">{row.period.total.toLocaleString()}</TableCell>
                      <TableCell className="py-3 tabular-nums">{row.lifetime.total.toLocaleString()}</TableCell>
                      {LEAD_ACTIVITY_BUCKETS.map((bucket) => (
                        <TableCell key={bucket.key} className="py-3 tabular-nums">
                          {leadActivityBucketValue(row.period, bucket.key).toLocaleString()}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
