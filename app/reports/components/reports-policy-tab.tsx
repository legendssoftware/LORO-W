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
  useVerificationQueue,
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
import { PolicyForecastCard } from './policy-forecast-card';
import { ReportsChartCard } from './reports-chart-card';
import { ReportsDashboardToolbar } from './reports-dashboard-toolbar';
import { ReportsListPagination, type ReportsPageSize } from './reports-list-pagination';
import { ReportsPolicySegmentRadial } from './reports-policy-segment-radial';
import { ReportsPolicyTable } from './reports-policy-table';
import {
  PolicyAcknowledgementCard,
  PolicyCustomerMap,
  PolicyExceptionsCard,
  PolicyReviewsPanel,
  PolicyStockIntel,
} from './reports-policy-workspace';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('screens');
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(backendUserData?.accessLevel, backendUserData);
  const isMultiUser = scope !== 'self';
  const canFinalise = scope === 'org';
  const queue = useVerificationQueue(isTokenReady && isMultiUser);

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
  const [signedFilter, setSignedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'below_standard' | 'meets_all' | 'not_measurable'>('all');

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
      ...(signedFilter === 'yes' ? { signed: true } : {}),
      ...(signedFilter === 'no' ? { signed: false } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      sort,
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
  }, [tooLong, from, to, branchFilter, countryFilter, search, selectedClerkId, signedFilter, statusFilter, sort, order, pageSize, page]);

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
    <div className="space-y-4" data-tour="reports-policy-tab">
      <PolicyForecastCard />

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
          {t('chrome.reports.pol.thisMonth')}
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
          {t('chrome.reports.pol.lastMonth')}
        </Button>
        {isMultiUser ? (
          <>
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
            placeholder={t('chrome.reports.pol.searchEmployees')}
            aria-label={t('chrome.reports.pol.searchEmployees')}
            title={t('chrome.reports.pol.searchHint')}
            className="h-9 w-48"
          />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label={t('chrome.reports.pol.signature')}
            value={signedFilter}
            onChange={(event) => {
              setSignedFilter(event.target.value as 'all' | 'yes' | 'no');
              setPage(1);
            }}
          >
            <option value="all">{t('chrome.reports.pol.allSignatures')}</option>
            <option value="no">{t('chrome.reports.pol.notSigned')}</option>
            <option value="yes">{t('chrome.reports.pol.signed')}</option>
          </select>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label={t('chrome.reports.pol.standard')}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'all' | 'below_standard' | 'meets_all' | 'not_measurable');
              setPage(1);
            }}
          >
            <option value="all">{t('chrome.reports.pol.allStandards')}</option>
            <option value="below_standard">{t('chrome.reports.pol.belowStandard')}</option>
            <option value="meets_all">{t('chrome.reports.pol.meetsStandards')}</option>
            <option value="not_measurable">{t('chrome.reports.pol.notMeasurable')}</option>
          </select>
          </>
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
            {t('actions.exportCsv')}
          </Button>
        </div>
      </div>

      {tooLong ? (
        <Alert variant="destructive">
          <AlertTitle>{t('chrome.reports.pol.rangeTooLong')}</AlertTitle>
          <AlertDescription>
            Pick a calendar month or a custom range of at most {POLICY_MAX_CUSTOM_DAYS} days.
          </AlertDescription>
        </Alert>
      ) : null}

      {policyDisabled ? (
        <Alert>
          <AlertTitle>{t('chrome.reports.pol.notEnabled')}</AlertTitle>
          <AlertDescription>
            {t('chrome.reports.pol.notEnabledHint')}
          </AlertDescription>
        </Alert>
      ) : null}

      {windowError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('chrome.reports.pol.periodNotReportable')}</AlertTitle>
          <AlertDescription>{t('chrome.reports.pol.periodNotReportableHint')}</AlertDescription>
        </Alert>
      ) : null}

      {data?.policy.shadowMode ? (
        <Alert>
          <AlertTitle>{t('chrome.reports.pol.shadowMode')}</AlertTitle>
          <AlertDescription>
            {t('chrome.reports.pol.shadowModeHint')}
          </AlertDescription>
        </Alert>
      ) : null}

      {report.isError && !policyDisabled && !windowError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('chrome.reports.pol.reportLoadError')}</AlertTitle>
          <AlertDescription>{t('chrome.reports.pol.tryAgainMoment')}</AlertDescription>
        </Alert>
      ) : null}

      {!policyDisabled ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReportsChartCard title={t('chrome.reports.pol.standards')} description={t('chrome.reports.pol.employeesByResult')}>
              {report.isLoading || !totals ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ReportsPolicySegmentRadial
                  centerLabel={formatPolicyPct(totals.avgActivityPct)}
                  centerSub="Avg activity"
                  segments={[
                    { key: 'meets', label: t('chrome.reports.pol.meets'), value: totals.meetingAllStandards, color: REPORTS_CHART_GREEN },
                    { key: 'below', label: t('chrome.reports.pol.below'), value: totals.belowStandard, color: REPORTS_CHART_RED },
                    { key: 'na', label: t('chrome.reports.pol.notMeasurable'), value: totals.notMeasurable, color: REPORTS_CHART_AMBER },
                  ]}
                />
              )}
            </ReportsChartCard>
            <ReportsChartCard title={t('chrome.reports.pol.verifiedVisits')} description={t('chrome.reports.pol.againstExpectedVisits')}>
              {report.isLoading || !totals ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ReportsPolicySegmentRadial
                  centerLabel={verifiedExpected > 0 ? formatPolicyPct(verifiedActual / verifiedExpected) : '—'}
                  centerSub={`${verifiedActual.toLocaleString()} / ${verifiedExpected.toLocaleString()}`}
                  segments={[
                    { key: 'done', label: t('chrome.reports.pol.verified'), value: verifiedActual, color: REPORTS_CHART_GREEN },
                    {
                      key: 'left',
                      label: t('chrome.reports.pol.remaining'),
                      value: Math.max(0, verifiedExpected - verifiedActual),
                      color: REPORTS_CHART_RED,
                    },
                  ]}
                />
              )}
            </ReportsChartCard>
            <ReportsChartCard title={t('chrome.reports.pol.qualifyingCalls')} description={t('chrome.reports.pol.againstExpectedCalls')}>
              {report.isLoading || !totals ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ReportsPolicySegmentRadial
                  centerLabel={callsExpected > 0 ? formatPolicyPct(callsActual / callsExpected) : '—'}
                  centerSub={`${callsActual.toLocaleString()} / ${callsExpected.toLocaleString()}`}
                  segments={[
                    { key: 'done', label: t('chrome.reports.pol.qualifying'), value: callsActual, color: REPORTS_CHART_GREEN },
                    {
                      key: 'left',
                      label: t('chrome.reports.pol.remaining'),
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
              <SummaryCard title={t('chrome.reports.pol.employees')}>
                <p className="text-2xl font-semibold tabular-nums">{totals.users.toLocaleString()}</p>
              </SummaryCard>
              <SummaryCard title={t('chrome.reports.pol.flaggedVisits')}>
                <p className="text-2xl font-semibold tabular-nums">{totals.flaggedVisits.toLocaleString()}</p>
              </SummaryCard>
              <SummaryCard title={t('chrome.reports.pol.incompleteVisits')}>
                <p className="text-2xl font-semibold tabular-nums">{totals.incompleteVisits.toLocaleString()}</p>
              </SummaryCard>
              <SummaryCard title={t('chrome.reports.pol.pendingExceptions')}>
                <p className="text-2xl font-semibold tabular-nums">{totals.pendingExceptions.toLocaleString()}</p>
              </SummaryCard>
            </div>
          ) : null}

          {queue.data && queue.data.items.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('chrome.reports.pol.visitsToReview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {queue.data.items.map((item) => {
                    const reason =
                      [...item.flags, ...item.missing.map((entry) => `missing ${entry}`)].join(', ') || item.status;
                    return (
                      <li key={item.checkInUid}>
                        Visit {item.checkInUid}: {reason}. Suggested action: review.
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <ReportsPolicyTable
            rows={data?.rows ?? []}
            isLoading={report.isLoading}
            sort={sort}
            order={order}
            onSortChange={handleSort}
            showPay={showPay}
          />

          <div className="space-y-4">
            <PolicyAcknowledgementCard />
            <PolicyExceptionsCard enabled={isMultiUser && !policyDisabled} />
            <PolicyReviewsPanel enabled={!policyDisabled} canManage={isMultiUser} />
            <PolicyCustomerMap enabled={isMultiUser && !policyDisabled} />
            <PolicyStockIntel enabled={isMultiUser && !policyDisabled} />
          </div>

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
