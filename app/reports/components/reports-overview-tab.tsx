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
  USER_TARGET_QUERY_KEY_PREFIX,
} from '@/api/hooks';
import { getUserTarget } from '@/api/endpoints/user';
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

  const warningQueryStamp = warningQueries
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
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stamp tracks settled payloads
  }, [
    pageRows,
    warningQueryStamp,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
  ]);

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
    return row;
  }, [
    isElevated,
    backendUserData,
    selfRef,
    selfTargetQuery.data?.userTarget,
    rangeParams,
    engagementByUid,
    engagementQuery.isSuccess,
  ]);

  const displayRows = isElevated
    ? enrichedPageRows
    : selfRow
      ? [selfRow]
      : [];

  const isLoading = isElevated
    ? !isTokenReady ||
      isSyncing ||
      usersQuery.isLoading ||
      (!!rangeParams && engagementQuery.isLoading)
    : !isTokenReady ||
      isSyncing ||
      selfTargetQuery.isLoading ||
      (!!rangeParams && engagementQuery.isLoading);

  const errorMessage = isElevated
    ? usersQuery.isError
      ? getQueryErrorMessage(usersQuery.error)
      : engagementQuery.isError
        ? getQueryErrorMessage(engagementQuery.error)
        : null
    : selfTargetQuery.isError
      ? getQueryErrorMessage(selfTargetQuery.error)
      : engagementQuery.isError
        ? getQueryErrorMessage(engagementQuery.error)
        : null;

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
              if (rangeParams) void engagementQuery.refetch();
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
              (engagementQuery.isFetching && !engagementQuery.isLoading)
            }
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        ) : null}
      </div>

      <ReportsTargetDetailDialog
        row={selectedRow}
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
