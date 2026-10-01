'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useApiClient,
  useBranches,
  useExportPolicyReport,
  useFinalisePolicyMonth,
  usePolicyReport,
  useSessionSync,
  useTokenReady,
} from '@/api/hooks';
import { useQuery } from '@tanstack/react-query';
import type { PolicyReportParams, PolicyReportSortKey } from '@/api/types/performance-policy';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getReportsDataScope } from '@/lib/access';
import { formatUtcYmd, utcWholeMonthRange } from '@/lib/utils/overview-daily-summary';
import { fetchReportsOrgUsers, REPORTS_USERS_QUERY_KEY } from '../lib/reports-scope-allowlist';
import {
  REPORTS_CHART_AMBER,
  REPORTS_CHART_GREEN,
  REPORTS_CHART_RED,
} from '../lib/reports-dashboard-chart-helpers';
import { downloadTextFile, formatPolicyPct } from '../lib/reports-policy-format';
import {
  calendarMonthOfRange,
  isPolicyRangeTooLong,
  isPolicyWindowClosed,
  POLICY_MAX_CUSTOM_DAYS,
  previousMonthRange,
  toPolicyWindow,
} from '../lib/reports-policy-window';
import { useReportsDateRange } from '../lib/use-reports-date-range';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsListPagination, type ReportsPageSize } from './reports-list-pagination';
import { ReportsPolicySegmentRadial } from './reports-policy-segment-radial';
import { ReportsPolicyTable } from './reports-policy-table';

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Reports > Policy: the sales performance policy scored per employee for a calendar month or custom period,
 * with radial summaries, a sortable / pageable table, CSV export and (org-wide roles) month finalisation.
 */
export function ReportsPolicyTab() {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(backendUserData?.accessLevel, backendUserData);
  const isMultiUser = scope !== 'self';
  const canFinalise = scope === 'org';

  const monthDefault = useMemo(() => utcWholeMonthRange(), []);
  const { startDate, endDate, from, to, setRange } = useReportsDateRange(monthDefault.start, monthDefault.end);
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PolicyReportSortKey>('status');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ReportsPageSize>(25);

  const branchesQuery = useBranches({ enabled: isTokenReady && isMultiUser });
  const usersQuery = useQuery({
    queryKey: [...REPORTS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchReportsOrgUsers(client),
    enabled: isTokenReady && isMultiUser,
    staleTime: 5 * 60 * 1000,
  });
  // GET /user is already scoped server-side (self, team or org), so the list is the pickable set.
  const pickableUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const tooLong = isPolicyRangeTooLong(from, to);
  const selectedMonth = calendarMonthOfRange(from, to);
  const windowIsClosed = isPolicyWindowClosed(to);

  const selectedClerkId = useMemo(() => {
    if (userFilter === 'all') return undefined;
    return pickableUsers.find((user) => String(user.uid) === userFilter)?.clerkUserId;
  }, [userFilter, pickableUsers]);

  const params = useMemo<PolicyReportParams | null>(() => {
    if (tooLong) return null;
    const branchUid = branchFilter !== 'all' && Number.isFinite(Number(branchFilter)) ? Number(branchFilter) : undefined;
    return {
      ...toPolicyWindow(from, to),
      ...(branchUid != null ? { branchUid } : {}),
      ...(countryFilter !== 'all' ? { country: countryFilter } : {}),
      ...(search ? { search } : {}),
      ...(selectedClerkId ? { userClerkUserIds: selectedClerkId } : {}),
      sort,
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
  }, [tooLong, from, to, branchFilter, countryFilter, search, selectedClerkId, sort, order, pageSize, page]);

  const report = usePolicyReport(params, { enabled: isTokenReady, windowIsClosed });
  const exportReport = useExportPolicyReport();
  const finalise = useFinalisePolicyMonth();

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function handleSort(key: PolicyReportSortKey) {
    setPage(1);
    if (key === sort) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSort(key);
    setOrder(key === 'name' || key === 'status' ? 'asc' : 'desc');
  }

  async function handleExport() {
    if (!params) return;
    try {
      const csv = await exportReport.mutateAsync({ ...params, limit: undefined, offset: undefined });
      downloadTextFile(`performance-policy-${from}_${to}.csv`, csv);
    } catch {
      toast.error('Could not export the report');
    }
  }

  async function handleFinalise() {
    if (!selectedMonth) return;
    try {
      const result = await finalise.mutateAsync(selectedMonth);
      toast.success(`Finalised ${result.month} for ${result.users} employees`);
    } catch {
      toast.error('Could not finalise this month');
    }
  }

  const data = report.data;
  const totals = data?.totals;
  const policyDisabled = report.isError && (report.error as { response?: { status?: number } })?.response?.status === 404;
  const windowError =
    report.isError && (report.error as { response?: { status?: number } })?.response?.status === 400;
  const totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / pageSize)) : 1;
  const showPay = (data?.rows ?? []).some((row) => row.payPct != null);

  const verifiedExpected = totals?.visits.expected ?? 0;
  const verifiedActual = totals?.visits.verified ?? 0;
  const callsExpected = totals?.calls.expected ?? 0;
  const callsActual = totals?.calls.qualifying ?? 0;

  return (
    <div className="space-y-4">
      <ReportsDashboardToolbar
        startDate={startDate}
        endDate={endDate}
        onRangeChange={resetPage(setRange)}
        showDimensionFilters={isMultiUser}
        branches={branchesQuery.data ?? []}
        users={pickableUsers}
        selectedBranchId={branchFilter}
        onBranchChange={resetPage(setBranchFilter)}
        selectedUserId={userFilter}
        onUserChange={resetPage(setUserFilter)}
        selectedCountry={countryFilter}
        onCountryChange={resetPage(setCountryFilter)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRange(utcWholeMonthRange());
            setPage(1);
          }}
        >
          This month
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRange(previousMonthRange());
            setPage(1);
          }}
        >
          Last month
        </Button>
        {isMultiUser ? (
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onBlur={() => {
              setSearch(searchInput.trim());
              setPage(1);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              setSearch(searchInput.trim());
              setPage(1);
            }}
            placeholder="Search employees"
            aria-label="Search employees"
            title="Press Enter or leave the field to search"
            className="h-9 w-48"
          />
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {data?.source === 'snapshot' && data.finalisedAt ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" aria-hidden />
              Finalised {formatUtcYmd(new Date(data.finalisedAt))}
            </Badge>
          ) : null}
          {canFinalise && selectedMonth && windowIsClosed ? (
            <Button type="button" size="sm" variant="outline" disabled={finalise.isPending} onClick={handleFinalise}>
              {finalise.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden /> : null}
              {data?.source === 'snapshot' ? 'Re-finalise month' : 'Finalise month'}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={exportReport.isPending || !params || policyDisabled}
            onClick={handleExport}
          >
            {exportReport.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1.5 size-4" aria-hidden />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {tooLong ? (
        <Alert variant="destructive">
          <AlertTitle>Range too long</AlertTitle>
          <AlertDescription>
            Pick a calendar month or a custom range of at most {POLICY_MAX_CUSTOM_DAYS} days.
          </AlertDescription>
        </Alert>
      ) : null}

      {policyDisabled ? (
        <Alert>
          <AlertTitle>Performance policy is not enabled</AlertTitle>
          <AlertDescription>
            Turn on the sales performance policy in organisation settings to see this report.
          </AlertDescription>
        </Alert>
      ) : null}

      {windowError ? (
        <Alert variant="destructive">
          <AlertTitle>That period cannot be reported</AlertTitle>
          <AlertDescription>The period may be in the future. Choose a month that has started.</AlertDescription>
        </Alert>
      ) : null}

      {data?.policy.shadowMode ? (
        <Alert>
          <AlertTitle>Shadow mode</AlertTitle>
          <AlertDescription>
            The policy is being measured but not applied. Employees do not see pay results yet.
          </AlertDescription>
        </Alert>
      ) : null}

      {report.isError && !policyDisabled && !windowError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the report</AlertTitle>
          <AlertDescription>Try again in a moment.</AlertDescription>
        </Alert>
      ) : null}

      {!policyDisabled ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReportsChartCard title="Standards" description="Employees by result">
              {report.isLoading || !totals ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ReportsPolicySegmentRadial
                  centerLabel={formatPolicyPct(totals.avgActivityPct)}
                  centerSub="Avg activity"
                  segments={[
                    { key: 'meets', label: 'Meets', value: totals.meetingAllStandards, color: REPORTS_CHART_GREEN },
                    { key: 'below', label: 'Below', value: totals.belowStandard, color: REPORTS_CHART_RED },
                    { key: 'na', label: 'Not measurable', value: totals.notMeasurable, color: REPORTS_CHART_AMBER },
                  ]}
                />
              )}
            </ReportsChartCard>
            <ReportsChartCard title="Verified visits" description="Against the expected visits">
              {report.isLoading || !totals ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ReportsPolicySegmentRadial
                  centerLabel={verifiedExpected > 0 ? formatPolicyPct(verifiedActual / verifiedExpected) : '—'}
                  centerSub={`${verifiedActual.toLocaleString()} / ${verifiedExpected.toLocaleString()}`}
                  segments={[
                    { key: 'done', label: 'Verified', value: verifiedActual, color: REPORTS_CHART_GREEN },
                    {
                      key: 'left',
                      label: 'Remaining',
                      value: Math.max(0, verifiedExpected - verifiedActual),
                      color: REPORTS_CHART_RED,
                    },
                  ]}
                />
              )}
            </ReportsChartCard>
            <ReportsChartCard title="Qualifying calls" description="Against the expected calls">
              {report.isLoading || !totals ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ReportsPolicySegmentRadial
                  centerLabel={callsExpected > 0 ? formatPolicyPct(callsActual / callsExpected) : '—'}
                  centerSub={`${callsActual.toLocaleString()} / ${callsExpected.toLocaleString()}`}
                  segments={[
                    { key: 'done', label: 'Qualifying', value: callsActual, color: REPORTS_CHART_GREEN },
                    {
                      key: 'left',
                      label: 'Remaining',
                      value: Math.max(0, callsExpected - callsActual),
                      color: REPORTS_CHART_RED,
                    },
                  ]}
                />
              )}
            </ReportsChartCard>
          </div>

          {totals ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryCard title="Employees">
                <p className="text-2xl font-semibold tabular-nums">{totals.users.toLocaleString()}</p>
              </SummaryCard>
              <SummaryCard title="Flagged visits">
                <p className="text-2xl font-semibold tabular-nums">{totals.flaggedVisits.toLocaleString()}</p>
              </SummaryCard>
              <SummaryCard title="Incomplete visits">
                <p className="text-2xl font-semibold tabular-nums">{totals.incompleteVisits.toLocaleString()}</p>
              </SummaryCard>
              <SummaryCard title="Pending exceptions">
                <p className="text-2xl font-semibold tabular-nums">{totals.pendingExceptions.toLocaleString()}</p>
              </SummaryCard>
            </div>
          ) : null}

          <ReportsPolicyTable
            rows={data?.rows ?? []}
            isLoading={report.isLoading}
            sort={sort}
            order={order}
            onSortChange={handleSort}
            showPay={showPay}
          />

          {data ? (
            <ReportsListPagination
              page={page}
              totalPages={totalPages}
              total={data.pagination.total}
              pageSize={pageSize}
              isFetching={report.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
