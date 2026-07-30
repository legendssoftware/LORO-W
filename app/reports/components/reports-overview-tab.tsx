'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useSessionSync,
  useTokenReady,
  useUser,
  useUserTarget,
  useApiClient,
  useEngagementRange,
  useAttendanceReport,
  usePayrollHoursAll,
  useAttMetricsByUser,
  useProfileSales,
  useDailyProductivity,
  useBranches,
  useExchangeRates,
} from '@/api/hooks';
import { getBranchDisplayLabel } from '@/api/types/branch';
import {
  ReportsListPagination,
  readStoredReportsPageSize,
  REPORTS_PAGE_SIZE_STORAGE_KEY,
  type ReportsPageSize,
} from '@/app/reports/components/reports-list-pagination';
import { ReportsTargetDetailDialog } from '@/app/reports/components/reports-target-detail-dialog';
import { ReportsTargetsTable } from '@/app/reports/components/reports-targets-table';
import {
  ReportsTargetsToolbar,
  type ReportsTargetsSortMetric,
} from '@/app/reports/components/reports-targets-toolbar';
import {
  REPORTS_USERS_QUERY_KEY,
  resolveReportsAllowlistUids,
  userUidInAllowlist,
  fetchReportsOrgUsers,
} from '@/app/reports/lib/reports-scope-allowlist';
import { filterUsersByBranch } from '@/app/reports/lib/reports-user-branch';
import { resolveAttendanceReportPeriodHours } from '@/api/types/attendance';
import {
  applyEngagementToRow,
  applyErpSalesToRow,
  applyFilterPeriodLabel,
  applyHoursToRow,
  applyProductivityToRow,
  averageProductivityScore,
  rowFromPersonalTarget,
  rowFromUserListItem,
  branchCountryMapFromList,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import {
  applyCurrencyViewToRow,
  buildExchangeRateMap,
  currencyViewNeedsRates,
  type ReportsTargetsCurrencyView,
} from '@/app/reports/lib/reports-target-currency';
import {
  getPageRowEnrichmentKey,
  usePhasedPageEnrichment,
} from '@/app/reports/lib/use-phased-page-enrichment';
import { exportReportsTargets } from '@/app/reports/lib/reports-targets-export';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { getReportsDataScope } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  formatUtcYmd,
  resolveTargetsUtcCalendarRange,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import { userListItemInLeadsVisitsReportingCohort } from '@/lib/utils/user-has-performance-target';

const SEARCH_DEBOUNCE_MS = 300;

/** Metrics that need per-page enrich before a page-local re-sort is meaningful. */
const PAGE_LOCAL_SORT_METRICS = new Set<ReportsTargetsSortMetric>([
  'sales',
  'achievement',
  'productivity',
]);

function sortTargetRows(
  rows: ReportsTargetRow[],
  metric: ReportsTargetsSortMetric
): ReportsTargetRow[] {
  return [...rows].sort((a, b) => {
    switch (metric) {
      case 'achievement':
        return b.achievement - a.achievement || a.name.localeCompare(b.name);
      case 'sales':
        return (
          b.sales.progress - a.sales.progress ||
          b.sales.current - a.sales.current ||
          a.name.localeCompare(b.name)
        );
      case 'calls':
        return (
          b.calls.progress - a.calls.progress ||
          b.calls.current - a.calls.current ||
          a.name.localeCompare(b.name)
        );
      case 'leads':
        return (
          b.leads.progress - a.leads.progress ||
          b.leads.current - a.leads.current ||
          a.name.localeCompare(b.name)
        );
      case 'hours':
        return (
          b.hours.progress - a.hours.progress ||
          b.hours.current - a.hours.current ||
          a.name.localeCompare(b.name)
        );
      case 'productivity': {
        const sa = a.productivity.score ?? -1;
        const sb = b.productivity.score ?? -1;
        return sb - sa || a.name.localeCompare(b.name);
      }
      case 'name':
        return a.name.localeCompare(b.name);
      default: {
        const _exhaustive: never = metric;
        return _exhaustive;
      }
    }
  });
}

export function ReportsOverviewTab() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const client = useApiClient();

  const accessLevel = backendUserData?.accessLevel;
  const scope = getReportsDataScope(accessLevel);
  const isMultiUser = scope !== 'self';
  const selfRef =
    backendUserData?.clerkUserId?.trim() ||
    (backendUserData?.uid != null ? String(backendUserData.uid) : null);

  const today = utcToday();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ReportsPageSize>(25);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [useAllTime, setUseAllTime] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReportsTargetRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortMetric, setSortMetric] =
    useState<ReportsTargetsSortMetric>('name');
  const [currencyView, setCurrencyView] =
    useState<ReportsTargetsCurrencyView>('set');

  useEffect(() => {
    setPageSize(readStoredReportsPageSize());
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    scope,
    useAllTime,
    startDate,
    endDate,
    pageSize,
    branchFilter,
    userFilter,
    sortMetric,
    currencyView,
  ]);

  const branchesQuery = useBranches({
    enabled: isTokenReady && !isSyncing,
  });

  const branchCountryByUid = useMemo(
    () => branchCountryMapFromList(branchesQuery.data ?? []),
    [branchesQuery.data]
  );

  const selfProfileQuery = useUser(selfRef, {
    enabled: isTokenReady && !isSyncing && scope === 'team' && !!selfRef,
    includeAssignedClients: false,
  });

  const allowlistUids = useMemo(
    () =>
      resolveReportsAllowlistUids({
        scope,
        selfUid: backendUserData?.uid,
        managedStaff: selfProfileQuery.data?.managedStaff,
      }),
    [scope, backendUserData?.uid, selfProfileQuery.data?.managedStaff]
  );

  const branchIdFilter =
    isMultiUser &&
    branchFilter !== 'all' &&
    Number.isFinite(Number(branchFilter))
      ? Number(branchFilter)
      : null;

  const rangeParams = useMemo(() => {
    if (useAllTime) return null;
    const resolved = resolveTargetsUtcCalendarRange(startDate, endDate);
    return {
      from: resolved.fromYmd,
      to: resolved.toYmd,
      ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
    };
  }, [useAllTime, startDate, endDate, branchIdFilter]);

  const forexDate = useMemo(() => {
    if (rangeParams?.to) return rangeParams.to;
    return formatUtcYmd(today);
  }, [rangeParams?.to, today]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.debug('[reports-targets] filters', {
      useAllTime,
      startDate: formatUtcYmd(startDate),
      endDate: formatUtcYmd(endDate),
      rangeParams,
      debouncedSearch,
      scope,
      allowlistUids,
    });
  }, [
    useAllTime,
    startDate,
    endDate,
    rangeParams,
    debouncedSearch,
    scope,
    allowlistUids,
  ]);

  const usersQuery = useQuery({
    queryKey: [...REPORTS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchReportsOrgUsers(client),
    enabled: isTokenReady && !isSyncing && isMultiUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const selfTargetQuery = useUserTarget(selfRef, {
    enabled: isTokenReady && !isSyncing && !isMultiUser && !!selfRef,
  });

  const engagementQuery = useEngagementRange(rangeParams, {
    enabled: isTokenReady && !isSyncing && !!rangeParams,
  });

  const attendanceReportQuery = useAttendanceReport(
    {
      dateFrom: rangeParams?.from,
      dateTo: rangeParams?.to,
      includeUserDetails: false,
      ...(branchIdFilter != null ? { branchId: String(branchIdFilter) } : {}),
    },
    {
      enabled: isTokenReady && !isSyncing && !!rangeParams,
    }
  );

  const payrollHoursQuery = usePayrollHoursAll(
    {
      ...(branchIdFilter != null ? { branchId: String(branchIdFilter) } : {}),
    },
    {
      enabled: isTokenReady && !isSyncing && useAllTime && isMultiUser,
    }
  );

  const selfAttMetricsQuery = useAttMetricsByUser(
    !isMultiUser ? backendUserData?.uid ?? null : null,
    {
      enabled:
        isTokenReady &&
        !isSyncing &&
        !isMultiUser &&
        useAllTime &&
        backendUserData?.uid != null,
    }
  );

  const engagementByUid = useMemo(() => {
    const map = new Map<number, { callCount: number; leadCount: number; visitCount: number }>();
    for (const u of engagementQuery.data?.users ?? []) {
      map.set(u.uid, {
        callCount: u.callCount,
        leadCount: u.leadCount,
        visitCount: u.visitCount,
      });
    }
    return map;
  }, [engagementQuery.data?.users]);

  const hoursByUid = useMemo(() => {
    const map = new Map<number, number>();
    if (rangeParams && attendanceReportQuery.isSuccess) {
      for (const m of attendanceReportQuery.data?.report?.userMetrics ?? []) {
        map.set(m.userId, resolveAttendanceReportPeriodHours(m.metrics));
      }
      return map;
    }
    if (useAllTime && isMultiUser && payrollHoursQuery.isSuccess) {
      for (const m of payrollHoursQuery.data?.userMetrics ?? []) {
        map.set(m.userId, m.payrollHours);
      }
      return map;
    }
    if (
      useAllTime &&
      !isMultiUser &&
      selfAttMetricsQuery.isSuccess &&
      backendUserData?.uid != null
    ) {
      const payroll = selfAttMetricsQuery.data?.totalHours?.payrollHours;
      if (typeof payroll === 'number' && Number.isFinite(payroll)) {
        map.set(backendUserData.uid, payroll);
      }
    }
    return map;
  }, [
    rangeParams,
    attendanceReportQuery.isSuccess,
    attendanceReportQuery.data?.report?.userMetrics,
    useAllTime,
    isMultiUser,
    payrollHoursQuery.isSuccess,
    payrollHoursQuery.data?.userMetrics,
    selfAttMetricsQuery.isSuccess,
    selfAttMetricsQuery.data?.totalHours?.payrollHours,
    backendUserData?.uid,
  ]);

  const hoursOverlayReady = rangeParams
    ? attendanceReportQuery.isSuccess
    : useAllTime
      ? isMultiUser
        ? payrollHoursQuery.isSuccess
        : selfAttMetricsQuery.isSuccess
      : false;

  const allowlistedUsers = useMemo(
    () =>
      (usersQuery.data ?? []).filter((u) =>
        userUidInAllowlist(u.uid, allowlistUids)
      ),
    [usersQuery.data, allowlistUids]
  );

  const branchScopedUsers = useMemo(
    () => filterUsersByBranch(allowlistedUsers, branchIdFilter),
    [allowlistedUsers, branchIdFilter]
  );

  const selectedBranch = useMemo(
    () =>
      branchIdFilter != null
        ? (branchesQuery.data ?? []).find((b) => b.uid === branchIdFilter) ??
          null
        : null,
    [branchesQuery.data, branchIdFilter]
  );

  /** When a branch is selected but the branches/users list has not resolved yet, avoid unfiltered rows. */
  const branchFilterPending =
    branchIdFilter != null &&
    ((branchesQuery.isLoading && selectedBranch == null) ||
      (!usersQuery.isSuccess && usersQuery.data == null));

  const cohortUsersForToolbar = useMemo(
    () =>
      branchScopedUsers.filter(userListItemInLeadsVisitsReportingCohort),
    [branchScopedUsers]
  );

  const cohortRows = useMemo((): ReportsTargetRow[] => {
    if (!isMultiUser || branchFilterPending) return [];
    const users = branchScopedUsers;
    const engagementReady = !!rangeParams && engagementQuery.isSuccess;

    let rows = users
      .filter(userListItemInLeadsVisitsReportingCohort)
      .filter((user) => {
        if (userFilter !== 'all' && String(user.uid) !== userFilter) {
          return false;
        }
        if (!debouncedSearch) return true;
        const branchLabel = getBranchDisplayLabel(user.branch) || '';
        const hay = [
          user.name,
          user.surname,
          user.email,
          branchLabel,
          user.branch?.name,
          user.branch?.alias,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(debouncedSearch);
      })
      .map((user) => {
        let row = rowFromUserListItem(user, branchCountryByUid);
        if (engagementReady && rangeParams) {
          const eng = engagementByUid.get(row.userId) ?? {
            callCount: 0,
            leadCount: 0,
            visitCount: 0,
          };
          row = applyEngagementToRow(row, eng, rangeParams.from, rangeParams.to);
        }
        if (hoursOverlayReady) {
          const worked = hoursByUid.get(row.userId) ?? 0;
          row = applyHoursToRow(
            row,
            worked,
            rangeParams?.from ?? null,
            rangeParams?.to ?? null
          );
        }
        row = applyFilterPeriodLabel(
          row,
          rangeParams?.from ?? null,
          rangeParams?.to ?? null
        );
        return row;
      });

    // Cohort sort uses list + engagement/hours overlays (available for all rows).
    // Sales / achievement / productivity need per-page ERP enrich — those re-sort
    // the visible page after phased enrich settles.
    const metricForCohort = PAGE_LOCAL_SORT_METRICS.has(sortMetric)
      ? 'name'
      : sortMetric;
    return sortTargetRows(rows, metricForCohort);
  }, [
    isMultiUser,
    branchFilterPending,
    branchScopedUsers,
    debouncedSearch,
    userFilter,
    sortMetric,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
    hoursOverlayReady,
    hoursByUid,
    branchCountryByUid,
  ]);

  const total = cohortRows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return cohortRows.slice(start, start + pageSize);
  }, [cohortRows, safePage, pageSize]);

  const {
    enrichmentByKey,
    isEnriching,
    enrichRow: applyPhasedEnrichment,
  } = usePhasedPageEnrichment({
    pageRows,
    client,
    enabled: isTokenReady && isMultiUser && pageRows.length > 0,
    rangeFrom: rangeParams?.from ?? null,
    rangeTo: rangeParams?.to ?? null,
  });

  const enrichedPageRows = useMemo(() => {
    const engagementReady = !!rangeParams && engagementQuery.isSuccess;
    return pageRows.map((row) => {
      let next = applyPhasedEnrichment(row);
      const enrich = enrichmentByKey.get(getPageRowEnrichmentKey(row));
      if (enrich?.erpLoading) {
        next = { ...next, salesLoading: true };
      } else if (next.salesLoading) {
        next = { ...next, salesLoading: false };
      }
      if (engagementReady && rangeParams) {
        const eng = engagementByUid.get(row.userId) ?? {
          callCount: 0,
          leadCount: 0,
          visitCount: 0,
        };
        next = applyEngagementToRow(next, eng, rangeParams.from, rangeParams.to);
      }
      if (hoursOverlayReady) {
        const worked = hoursByUid.get(row.userId) ?? 0;
        next = applyHoursToRow(
          next,
          worked,
          rangeParams?.from ?? null,
          rangeParams?.to ?? null
        );
      }
      next = applyFilterPeriodLabel(
        next,
        rangeParams?.from ?? null,
        rangeParams?.to ?? null
      );
      return next;
    });
  }, [
    pageRows,
    applyPhasedEnrichment,
    enrichmentByKey,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
    hoursOverlayReady,
    hoursByUid,
  ]);

  const selfHasSalesTarget = useMemo(() => {
    const ut = selfTargetQuery.data?.userTarget;
    if (!ut || typeof ut !== 'object') return false;
    const personal =
      'personalTargets' in ut &&
      ut.personalTargets &&
      typeof ut.personalTargets === 'object'
        ? (ut.personalTargets as { sales?: { target?: unknown } })
        : null;
    const t = personal?.sales?.target;
    const n = typeof t === 'number' ? t : Number(t);
    return Number.isFinite(n) && n > 0;
  }, [selfTargetQuery.data?.userTarget]);

  const selfErpSalesQuery = useProfileSales({
    enabled:
      isTokenReady &&
      !isSyncing &&
      !isMultiUser &&
      !!selfRef &&
      selfHasSalesTarget,
  });

  const selfProductivityQuery = useDailyProductivity(
    selfRef,
    rangeParams?.from ?? null,
    rangeParams?.to ?? null,
    {
      enabled:
        isTokenReady &&
        !isSyncing &&
        !isMultiUser &&
        !!selfRef &&
        !!rangeParams?.from &&
        !!rangeParams?.to,
    }
  );

  const selfRow = useMemo((): ReportsTargetRow | null => {
    if (isMultiUser || !backendUserData || !selfRef) return null;
    const name =
      [backendUserData.name, backendUserData.surname].filter(Boolean).join(' ').trim() ||
      backendUserData.email ||
      'You';
    const branchLabel =
      getBranchDisplayLabel(
        backendUserData.branch as { name?: string; alias?: string | null } | null
      ) || null;
    const selfBranchUid =
      backendUserData.branch?.uid ?? backendUserData.branchUid ?? null;
    const branchCountryCode =
      selfBranchUid != null
        ? branchCountryByUid.get(Number(selfBranchUid)) ?? null
        : null;
    let row = rowFromPersonalTarget({
      userId: backendUserData.uid,
      ref: selfRef,
      name,
      email: backendUserData.email ?? '',
      photoURL: backendUserData.photoURL ?? backendUserData.avatar ?? null,
      branch: branchLabel,
      branchCountryCode,
      dashboard: selfTargetQuery.data?.userTarget ?? null,
    });
    if (row && rangeParams && engagementQuery.isSuccess) {
      const eng = engagementByUid.get(row.userId) ?? {
        callCount: 0,
        leadCount: 0,
        visitCount: 0,
      };
      row = applyEngagementToRow(row, eng, rangeParams.from, rangeParams.to);
    }
    if (row && hoursOverlayReady) {
      const worked = hoursByUid.get(row.userId) ?? 0;
      row = applyHoursToRow(
        row,
        worked,
        rangeParams?.from ?? null,
        rangeParams?.to ?? null
      );
    }
    if (row) {
      const erpPending =
        selfHasSalesTarget &&
        selfErpSalesQuery.isLoading &&
        selfErpSalesQuery.data == null;
      row = {
        ...applyErpSalesToRow(row, selfErpSalesQuery.data?.totalRevenue),
        salesLoading: erpPending,
      };
      if (rangeParams) {
        row = applyProductivityToRow(
          row,
          averageProductivityScore(selfProductivityQuery.data?.days),
          { isLoading: selfProductivityQuery.isLoading }
        );
      }
      row = applyFilterPeriodLabel(
        row,
        rangeParams?.from ?? null,
        rangeParams?.to ?? null
      );
    }
    return row;
  }, [
    isMultiUser,
    backendUserData,
    selfRef,
    selfTargetQuery.data?.userTarget,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
    hoursOverlayReady,
    hoursByUid,
    selfHasSalesTarget,
    selfErpSalesQuery.isLoading,
    selfErpSalesQuery.data,
    selfProductivityQuery.data?.days,
    selfProductivityQuery.isLoading,
    branchCountryByUid,
  ]);

  const displayRows = useMemo(() => {
    const rows = isMultiUser
      ? enrichedPageRows
      : selfRow
        ? [selfRow]
        : [];
    // Page-local re-sort for metrics that depend on phased enrich (sales / ERP /
    // achievement / productivity). Calls / leads / hours / name already sorted
    // across the full filtered cohort before pagination.
    if (PAGE_LOCAL_SORT_METRICS.has(sortMetric)) {
      return sortTargetRows(rows, sortMetric);
    }
    return rows;
  }, [isMultiUser, enrichedPageRows, selfRow, sortMetric]);

  const needsForex = useMemo(
    () => currencyViewNeedsRates(displayRows, currencyView),
    [displayRows, currencyView]
  );

  const exchangeRatesQuery = useExchangeRates(forexDate, {
    enabled: isTokenReady && !isSyncing && needsForex,
  });

  const exchangeRateMap = useMemo(
    () => buildExchangeRateMap(exchangeRatesQuery.data?.rates),
    [exchangeRatesQuery.data?.rates]
  );

  const displayRowsWithCurrency = useMemo(() => {
    let rows: ReportsTargetRow[];
    if (!needsForex) {
      rows = displayRows.map((row) =>
        applyCurrencyViewToRow(row, currencyView, exchangeRateMap)
      );
    } else if (exchangeRatesQuery.isLoading && !exchangeRatesQuery.data) {
      rows = displayRows;
    } else {
      rows = displayRows.map((row) =>
        applyCurrencyViewToRow(row, currencyView, exchangeRateMap)
      );
    }
    if (PAGE_LOCAL_SORT_METRICS.has(sortMetric)) {
      return sortTargetRows(rows, sortMetric);
    }
    return rows;
  }, [
    displayRows,
    currencyView,
    exchangeRateMap,
    needsForex,
    exchangeRatesQuery.isLoading,
    exchangeRatesQuery.data,
    sortMetric,
  ]);

  /** Keep detail dialog in sync when filter overlays update the same user row. */
  const detailRow = useMemo(() => {
    if (!selectedRow) return null;
    return (
      displayRowsWithCurrency.find((r) => r.ref === selectedRow.ref) ?? selectedRow
    );
  }, [selectedRow, displayRowsWithCurrency]);

  const hoursQueryError = rangeParams
    ? attendanceReportQuery.isError
      ? getQueryErrorMessage(attendanceReportQuery.error)
      : null
    : useAllTime
      ? isMultiUser
        ? payrollHoursQuery.isError
          ? getQueryErrorMessage(payrollHoursQuery.error)
          : null
        : selfAttMetricsQuery.isError
          ? getQueryErrorMessage(selfAttMetricsQuery.error)
          : null
      : null;

  const hoursQueryFetching = rangeParams
    ? attendanceReportQuery.isFetching && !attendanceReportQuery.isLoading
    : useAllTime
      ? isMultiUser
        ? payrollHoursQuery.isFetching && !payrollHoursQuery.isLoading
        : selfAttMetricsQuery.isFetching && !selfAttMetricsQuery.isLoading
      : false;

  /** Shell rows render as soon as the user list is ready — overlays enrich in place. */
  const isLoading = isMultiUser
    ? !isTokenReady ||
      isSyncing ||
      usersQuery.isLoading ||
      branchFilterPending
    : !isTokenReady || isSyncing || selfTargetQuery.isLoading;

  const errorMessage = isMultiUser
    ? usersQuery.isError
      ? getQueryErrorMessage(usersQuery.error)
      : engagementQuery.isError
        ? getQueryErrorMessage(engagementQuery.error)
        : hoursQueryError
    : selfTargetQuery.isError
      ? getQueryErrorMessage(selfTargetQuery.error)
      : engagementQuery.isError
        ? getQueryErrorMessage(engagementQuery.error)
        : hoursQueryError;

  const reviewStartYmd = useAllTime ? null : formatUtcYmd(startDate);
  const reviewEndYmd = useAllTime ? null : formatUtcYmd(endDate);

  const emptyMessage = useMemo(() => {
    if (!isMultiUser) return 'You do not have personal performance targets set.';
    if (branchFilterPending) return 'Loading branch users…';
    if (debouncedSearch) return 'No matching users with performance targets.';
    if (branchFilter !== 'all' && userFilter !== 'all') {
      return 'No matching user in the selected branch with performance targets.';
    }
    if (branchFilter !== 'all') {
      const assignedOnBranch = branchScopedUsers.length > 0;
      const withTargets = cohortUsersForToolbar.length > 0;
      if (assignedOnBranch && !withTargets) {
        return 'Users are assigned to this branch, but none have performance targets (calls, visits, or leads).';
      }
      return 'No users with performance targets in this branch.';
    }
    if (userFilter !== 'all') {
      return 'Selected user has no performance targets in this cohort.';
    }
    if (scope === 'team') {
      return 'No managed team members with performance targets found.';
    }
    return 'No users with performance targets found.';
  }, [
    isMultiUser,
    branchFilterPending,
    debouncedSearch,
    branchFilter,
    userFilter,
    scope,
    branchScopedUsers.length,
    cohortUsersForToolbar.length,
  ]);

  function handlePageSizeChange(size: ReportsPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(REPORTS_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  function handleRowClick(row: ReportsTargetRow) {
    setSelectedRow(row);
    setDetailOpen(true);
  }

  function resetDateToToday() {
    const t = utcToday();
    setStartDate(t);
    setEndDate(t);
    setUseAllTime(false);
  }

  function exportFileBaseName(): string {
    if (useAllTime) return 'loro-targets-all-time';
    return `loro-targets-${formatUtcYmd(startDate)}_${formatUtcYmd(endDate)}`;
  }

  function handleExportCsv() {
    if (displayRowsWithCurrency.length === 0) return;
    exportReportsTargets(displayRowsWithCurrency, 'csv', exportFileBaseName(), currencyView);
  }

  function handleExportExcel() {
    if (displayRowsWithCurrency.length === 0) return;
    exportReportsTargets(displayRowsWithCurrency, 'excel', exportFileBaseName(), currencyView);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-slot="reports-targets-tab">
      <ReportsTargetsToolbar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        startDate={startDate}
        endDate={endDate}
        useAllTime={useAllTime}
        onRangeChange={({ start, end }) => {
          setStartDate(start);
          setEndDate(end);
          setUseAllTime(false);
        }}
        onSetUseAllTime={setUseAllTime}
        onResetDateRange={resetDateToToday}
        showSearch={isMultiUser}
        showDimensionFilters={isMultiUser}
        branches={branchesQuery.data ?? []}
        users={cohortUsersForToolbar}
        selectedBranchId={branchFilter}
        onBranchChange={(id) => {
          setBranchFilter(id);
          setUserFilter('all');
        }}
        selectedUserId={userFilter}
        onUserChange={setUserFilter}
        sortMetric={sortMetric}
        onSortMetricChange={setSortMetric}
        currencyView={currencyView}
        onCurrencyViewChange={setCurrencyView}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        exportDisabled={isLoading || displayRowsWithCurrency.length === 0}
      />

      {errorMessage ? (
        <div className="mb-4">
          <QueryErrorBanner
            message={errorMessage}
            onRetry={() => {
              if (isMultiUser) void usersQuery.refetch();
              else void selfTargetQuery.refetch();
              if (rangeParams) {
                void engagementQuery.refetch();
                void attendanceReportQuery.refetch();
              }
              if (useAllTime) {
                if (isMultiUser) void payrollHoursQuery.refetch();
                else void selfAttMetricsQuery.refetch();
              }
            }}
          />
        </div>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
        data-slot="reports-targets-panel"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ReportsTargetsTable
            rows={displayRowsWithCurrency}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            emptyMessage={emptyMessage}
            currencyView={currencyView}
          />
        </div>
        {isMultiUser ? (
          <ReportsListPagination
            page={safePage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isFetching={
              (usersQuery.isFetching && !usersQuery.isLoading) ||
              (engagementQuery.isFetching && !engagementQuery.isLoading) ||
              hoursQueryFetching ||
              isEnriching
            }
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        ) : null}
      </div>

      <ReportsTargetDetailDialog
        row={detailRow}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedRow(null);
        }}
        reviewStartYmd={reviewStartYmd}
        reviewEndYmd={reviewEndYmd}
        currencyView={currencyView}
        exchangeRateMap={exchangeRateMap}
      />
    </div>
  );
}
