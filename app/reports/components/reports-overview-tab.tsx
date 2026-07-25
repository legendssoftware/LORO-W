'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  useSessionSync,
  useTokenReady,
  useUsers,
  useUserTarget,
  useApiClient,
  useEngagementRange,
  useAttendanceReport,
  usePayrollHoursAll,
  useAttMetricsByUser,
  useProfileSales,
  USER_TARGET_QUERY_KEY_PREFIX,
} from '@/api/hooks';
import { getUserTarget } from '@/api/endpoints/user';
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
import { ReportsTargetsToolbar } from '@/app/reports/components/reports-targets-toolbar';
import {
  applyEngagementToRow,
  applyErpSalesToRow,
  applyFilterPeriodLabel,
  applyHoursToRow,
  enrichRowWithTargetDashboard,
  rowFromPersonalTarget,
  rowFromUserListItem,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { isReportsElevatedViewer } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  formatUtcYmd,
  resolveTargetsUtcCalendarRange,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import { userListItemInLeadsVisitsReportingCohort } from '@/lib/utils/user-has-performance-target';

const SEARCH_DEBOUNCE_MS = 300;
const ERP_USER_SALES_QUERY_KEY = ['erp', 'user-sales'] as const;

export function ReportsOverviewTab() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const client = useApiClient();

  const accessLevel = backendUserData?.accessLevel;
  const isElevated = isReportsElevatedViewer(accessLevel);
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
  }, [debouncedSearch, isElevated, useAllTime, startDate, endDate, pageSize]);

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
      isElevated,
    });
  }, [useAllTime, startDate, endDate, rangeParams, debouncedSearch, isElevated]);

  const usersQuery = useUsers({
    limit: 200,
    enabled: isTokenReady && !isSyncing && isElevated,
  });

  const selfTargetQuery = useUserTarget(selfRef, {
    enabled: isTokenReady && !isSyncing && !isElevated && !!selfRef,
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
      enabled: isTokenReady && !isSyncing && useAllTime && isElevated,
    }
  );

  const selfAttMetricsQuery = useAttMetricsByUser(
    !isElevated ? backendUserData?.uid ?? null : null,
    {
      enabled:
        isTokenReady &&
        !isSyncing &&
        !isElevated &&
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
    if (useAllTime && isElevated && payrollHoursQuery.isSuccess) {
      for (const m of payrollHoursQuery.data?.userMetrics ?? []) {
        map.set(m.userId, m.payrollHours);
      }
      return map;
    }
    if (
      useAllTime &&
      !isElevated &&
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
    isElevated,
    payrollHoursQuery.isSuccess,
    payrollHoursQuery.data?.userMetrics,
    selfAttMetricsQuery.isSuccess,
    selfAttMetricsQuery.data?.totalHours?.payrollHours,
    backendUserData?.uid,
  ]);

  const hoursOverlayReady = rangeParams
    ? attendanceReportQuery.isSuccess
    : useAllTime
      ? isElevated
        ? payrollHoursQuery.isSuccess
        : selfAttMetricsQuery.isSuccess
      : false;

  const cohortRows = useMemo((): ReportsTargetRow[] => {
    if (!isElevated) return [];
    const users = usersQuery.data ?? [];
    return users
      .filter(userListItemInLeadsVisitsReportingCohort)
      .map(rowFromUserListItem)
      .filter((row) => {
        if (!debouncedSearch) return true;
        const hay = `${row.name} ${row.email} ${row.branch ?? ''}`.toLowerCase();
        return hay.includes(debouncedSearch);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isElevated, usersQuery.data, debouncedSearch]);

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
      enabled: isTokenReady && isElevated && !!row.ref,
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
        isTokenReady && isElevated && !!row.userId && row.sales.target > 0,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
    })),
  });

  const warningQueryStamp = warningQueries
    .map((q) => `${q.dataUpdatedAt}:${q.status}`)
    .join('|');
  const erpSalesQueryStamp = erpSalesQueries
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
      !isElevated &&
      !!selfRef &&
      selfHasSalesTarget,
  });

  const selfRow = useMemo((): ReportsTargetRow | null => {
    if (isElevated || !backendUserData || !selfRef) return null;
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
      row = applyFilterPeriodLabel(
        row,
        rangeParams?.from ?? null,
        rangeParams?.to ?? null
      );
    }
    return row;
  }, [
    isElevated,
    backendUserData,
    selfRef,
    selfTargetQuery.data?.userTarget,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
    hoursOverlayReady,
    hoursByUid,
    selfErpSalesQuery.data?.totalRevenue,
  ]);

  const displayRows = isElevated
    ? enrichedPageRows
    : selfRow
      ? [selfRow]
      : [];

  /** Keep detail dialog in sync when filter overlays update the same user row. */
  const detailRow = useMemo(() => {
    if (!selectedRow) return null;
    return displayRows.find((r) => r.ref === selectedRow.ref) ?? selectedRow;
  }, [selectedRow, displayRows]);

  const hoursQueryLoading = rangeParams
    ? attendanceReportQuery.isLoading
    : useAllTime
      ? isElevated
        ? payrollHoursQuery.isLoading
        : selfAttMetricsQuery.isLoading
      : false;

  const hoursQueryError = rangeParams
    ? attendanceReportQuery.isError
      ? getQueryErrorMessage(attendanceReportQuery.error)
      : null
    : useAllTime
      ? isElevated
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
      ? isElevated
        ? payrollHoursQuery.isFetching && !payrollHoursQuery.isLoading
        : selfAttMetricsQuery.isFetching && !selfAttMetricsQuery.isLoading
      : false;

  const isLoading = isElevated
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

  const errorMessage = isElevated
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
        showSearch={isElevated}
      />

      {errorMessage ? (
        <div className="mb-4">
          <QueryErrorBanner
            message={errorMessage}
            onRetry={() => {
              if (isElevated) void usersQuery.refetch();
              else void selfTargetQuery.refetch();
              if (rangeParams) {
                void engagementQuery.refetch();
                void attendanceReportQuery.refetch();
              }
              if (useAllTime) {
                if (isElevated) void payrollHoursQuery.refetch();
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
              isElevated
                ? debouncedSearch
                  ? 'No matching users with performance targets.'
                  : 'No users with performance targets found.'
                : 'You do not have personal performance targets set.'
            }
          />
        </div>
        {isElevated ? (
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
