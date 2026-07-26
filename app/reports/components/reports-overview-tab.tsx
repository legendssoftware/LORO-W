'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
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
  USER_TARGET_QUERY_KEY_PREFIX,
  DAILY_PRODUCTIVITY_KEY_PREFIX,
} from '@/api/hooks';
import { getDailyProductivity, getUserTarget, getUsers } from '@/api/endpoints/user';
import type { UserListItem } from '@/api/endpoints/user';
import {
  getUserSales,
  profileSalesFromResponse,
} from '@/api/endpoints/erp-user-sales';
import { resolveAttendanceReportPeriodHours } from '@/api/types/attendance';
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
  resolveReportsAllowlistUids,
  userUidInAllowlist,
} from '@/app/reports/lib/reports-scope-allowlist';
import {
  applyEngagementToRow,
  applyErpSalesToRow,
  applyFilterPeriodLabel,
  applyHoursToRow,
  applyProductivityToRow,
  averageProductivityScore,
  enrichRowWithTargetDashboard,
  rowFromPersonalTarget,
  rowFromUserListItem,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
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
const ERP_USER_SALES_QUERY_KEY = ['erp', 'user-sales'] as const;
const REPORTS_TARGETS_USERS_QUERY_KEY = ['users', 'reports-targets', 'all'] as const;
/** Server `MAX_PAGE_LIMIT` on GET /user is 100. */
const USERS_PAGE_LIMIT = 100;

async function fetchAllOrgUsers(
  client: Parameters<typeof getUsers>[0]
): Promise<UserListItem[]> {
  const all: UserListItem[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await getUsers(client, { page, limit: USERS_PAGE_LIMIT });
    const chunk = Array.isArray(res?.data) ? res.data : [];
    all.push(...chunk);
    totalPages = Math.max(1, Number(res?.meta?.totalPages) || 1);
    if (chunk.length === 0) break;
    page += 1;
    // Safety cap: 50 pages × 100 = 5000 users
    if (page > 50) break;
  }
  return all;
}

/** Prefer nested branch.uid; fall back to flat branchUid on list payloads. */
function resolveUserBranchUid(user: {
  branch?: { uid?: number | null } | null;
  branchUid?: unknown;
}): number | null {
  if (user.branch?.uid != null && Number.isFinite(Number(user.branch.uid))) {
    return Number(user.branch.uid);
  }
  if (typeof user.branchUid === 'number' && Number.isFinite(user.branchUid)) {
    return user.branchUid;
  }
  if (typeof user.branchUid === 'string' && user.branchUid.trim() !== '') {
    const n = Number(user.branchUid);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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
  ]);

  const branchesQuery = useBranches({
    enabled: isTokenReady && !isSyncing && isMultiUser,
  });

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

  const rangeParams = useMemo(() => {
    if (useAllTime) return null;
    const resolved = resolveTargetsUtcCalendarRange(startDate, endDate);
    return { from: resolved.fromYmd, to: resolved.toYmd };
  }, [useAllTime, startDate, endDate]);

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
    queryKey: [...REPORTS_TARGETS_USERS_QUERY_KEY, scope] as const,
    queryFn: () => fetchAllOrgUsers(client),
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
    },
    {
      enabled: isTokenReady && !isSyncing && !!rangeParams,
    }
  );

  const payrollHoursQuery = usePayrollHoursAll(
    {},
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

  const cohortRows = useMemo((): ReportsTargetRow[] => {
    if (!isMultiUser) return [];
    const users = usersQuery.data ?? [];
    const engagementReady = !!rangeParams && engagementQuery.isSuccess;

    let rows = users
      .filter(userListItemInLeadsVisitsReportingCohort)
      .filter((user) => userUidInAllowlist(user.uid, allowlistUids))
      .filter((user) => {
        if (userFilter !== 'all' && String(user.uid) !== userFilter) {
          return false;
        }
        if (branchFilter !== 'all') {
          const branchUid = resolveUserBranchUid(user);
          if (branchUid == null || String(branchUid) !== branchFilter) {
            return false;
          }
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
        let row = rowFromUserListItem(user);
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

    // Productivity scores load per page — name-sort until then; page re-sorts after enrich.
    const metricForCohort =
      sortMetric === 'productivity' ? 'name' : sortMetric;
    return sortTargetRows(rows, metricForCohort);
  }, [
    isMultiUser,
    usersQuery.data,
    allowlistUids,
    debouncedSearch,
    branchFilter,
    userFilter,
    sortMetric,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
    hoursOverlayReady,
    hoursByUid,
  ]);

  const total = cohortRows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return cohortRows.slice(start, start + pageSize);
  }, [cohortRows, safePage, pageSize]);

  const warningQueries = useQueries({
    queries: pageRows.map((row) => ({
      queryKey: [...USER_TARGET_QUERY_KEY_PREFIX, row.ref] as const,
      queryFn: () => getUserTarget(client, row.ref),
      enabled: isTokenReady && isMultiUser && !!row.ref,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    })),
  });

  const erpSalesQueries = useQueries({
    queries: pageRows.map((row) => ({
      queryKey: [...ERP_USER_SALES_QUERY_KEY, row.userId] as const,
      queryFn: async (): Promise<number | null> => {
        try {
          const res = await getUserSales(client, row.userId);
          const payload = profileSalesFromResponse(res);
          return payload?.totalRevenue ?? null;
        } catch {
          return null;
        }
      },
      enabled:
        isTokenReady && isMultiUser && !!row.userId && row.sales.target > 0,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    })),
  });

  const productivityQueries = useQueries({
    queries: pageRows.map((row) => ({
      queryKey: [
        ...DAILY_PRODUCTIVITY_KEY_PREFIX,
        row.ref,
        rangeParams?.from ?? null,
        rangeParams?.to ?? null,
      ] as const,
      queryFn: () =>
        getDailyProductivity(client, row.ref, {
          startDate: rangeParams!.from,
          endDate: rangeParams!.to,
        }),
      enabled:
        isTokenReady &&
        isMultiUser &&
        !!row.ref &&
        !!rangeParams?.from &&
        !!rangeParams?.to,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    })),
  });

  const warningQueryStamp = warningQueries
    .map((q) => `${q.dataUpdatedAt}:${q.status}`)
    .join('|');
  const erpSalesQueryStamp = erpSalesQueries
    .map((q) => `${q.dataUpdatedAt}:${q.status}`)
    .join('|');
  const productivityQueryStamp = productivityQueries
    .map((q) => `${q.dataUpdatedAt}:${q.status}`)
    .join('|');

  const enrichedPageRows = useMemo(() => {
    const engagementReady = !!rangeParams && engagementQuery.isSuccess;
    return pageRows.map((row, index) => {
      const dashboard = warningQueries[index]?.data?.userTarget ?? null;
      let next = dashboard ? enrichRowWithTargetDashboard(row, dashboard) : row;
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
      next = applyErpSalesToRow(next, erpSalesQueries[index]?.data);
      const prodQuery = productivityQueries[index];
      if (rangeParams) {
        next = applyProductivityToRow(
          next,
          averageProductivityScore(prodQuery?.data?.days),
          { isLoading: prodQuery?.isLoading === true }
        );
      }
      next = applyFilterPeriodLabel(
        next,
        rangeParams?.from ?? null,
        rangeParams?.to ?? null
      );
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stamps track settled payloads
  }, [
    pageRows,
    warningQueryStamp,
    erpSalesQueryStamp,
    productivityQueryStamp,
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
    let row = rowFromPersonalTarget({
      userId: backendUserData.uid,
      ref: selfRef,
      name,
      email: backendUserData.email ?? '',
      photoURL: backendUserData.photoURL ?? backendUserData.avatar ?? null,
      branch: branchLabel,
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
      row = applyErpSalesToRow(row, selfErpSalesQuery.data?.totalRevenue);
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
    selfErpSalesQuery.data?.totalRevenue,
    selfProductivityQuery.data?.days,
    selfProductivityQuery.isLoading,
  ]);

  const displayRows = useMemo(() => {
    const rows = isMultiUser
      ? enrichedPageRows
      : selfRow
        ? [selfRow]
        : [];
    // Re-sort the visible page after per-row enrich (ERP sales, productivity, warnings)
    // so Achievement / Sales / Productivity match what the table shows.
    return sortTargetRows(rows, sortMetric);
  }, [isMultiUser, enrichedPageRows, selfRow, sortMetric]);

  /** Keep detail dialog in sync when filter overlays update the same user row. */
  const detailRow = useMemo(() => {
    if (!selectedRow) return null;
    return displayRows.find((r) => r.ref === selectedRow.ref) ?? selectedRow;
  }, [selectedRow, displayRows]);

  const hoursQueryLoading = rangeParams
    ? attendanceReportQuery.isLoading
    : useAllTime
      ? isMultiUser
        ? payrollHoursQuery.isLoading
        : selfAttMetricsQuery.isLoading
      : false;

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

  const isLoading = isMultiUser
    ? !isTokenReady ||
      isSyncing ||
      usersQuery.isLoading ||
      (!!rangeParams && engagementQuery.isLoading) ||
      hoursQueryLoading
    : !isTokenReady ||
      isSyncing ||
      selfTargetQuery.isLoading ||
      (!!rangeParams && engagementQuery.isLoading) ||
      hoursQueryLoading;

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
    if (displayRows.length === 0) return;
    exportReportsTargets(displayRows, 'csv', exportFileBaseName());
  }

  function handleExportExcel() {
    if (displayRows.length === 0) return;
    exportReportsTargets(displayRows, 'excel', exportFileBaseName());
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-tour="reports-targets-tab">
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
        users={(usersQuery.data ?? [])
          .filter(userListItemInLeadsVisitsReportingCohort)
          .filter((u) => userUidInAllowlist(u.uid, allowlistUids))}
        selectedBranchId={branchFilter}
        onBranchChange={setBranchFilter}
        selectedUserId={userFilter}
        onUserChange={setUserFilter}
        sortMetric={sortMetric}
        onSortMetricChange={setSortMetric}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        exportDisabled={isLoading || displayRows.length === 0}
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
        data-tour="reports-targets-panel"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ReportsTargetsTable
            rows={displayRows}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            emptyMessage={
              isMultiUser
                ? debouncedSearch
                  ? 'No matching users with performance targets.'
                  : scope === 'team'
                    ? 'No managed team members with performance targets found.'
                    : 'No users with performance targets found.'
                : 'You do not have personal performance targets set.'
            }
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
              hoursQueryFetching
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
      />
    </div>
  );
}
