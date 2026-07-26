'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  usePayslips,
  useUserPayslips,
  useSessionSync,
  useTokenReady,
  useSearchableUsersList,
  useApiClient,
} from '@/api/hooks';
import { getPayslipDocument } from '@/api/endpoints/payslips';
import type { PayslipListItem } from '@/api/types/payslips';
import { PayslipsTable } from '@/components/payslips-table/payslips-table';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { canViewOrgPayslips } from '@/lib/payslips-scope';
import {
  buildPayslipFileName,
  filterPayslipListItems,
} from '@/lib/utils/payslips-format';
import { useSessionStore } from '@/store/session-store';
import { utcMonthStartThroughToday } from '@/lib/utils/overview-daily-summary';
import {
  PayslipsFiltersBar,
  payslipsFilterDatesFromState,
} from './components/payslips-filters-bar';
import { PayslipDetailDialog } from './components/payslip-detail-dialog';
import {
  PayslipsListPagination,
  readStoredPayslipsPageSize,
  PAYSLIPS_PAGE_SIZE_STORAGE_KEY,
  type PayslipsPageSize,
} from './components/payslips-list-pagination';
import toast from 'react-hot-toast';

export function PayslipsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading } = useSessionSync();
  const client = useApiClient();

  const defaultRange = useMemo(() => utcMonthStartThroughToday(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [useAllTime, setUseAllTime] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PayslipsPageSize>(() =>
    readStoredPayslipsPageSize()
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipListItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const profile = useSessionStore((s) => s.profileData);
  const canViewOrg = useMemo(
    () => canViewOrgPayslips(profile?.accessLevel, profile?.role),
    [profile?.accessLevel, profile?.role]
  );
  const currentUserId = profile?.uid != null ? Number(profile.uid) : null;

  const {
    users,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({
    limit: 100,
    enabled: isTokenReady && !sessionSyncLoading && canViewOrg,
  });

  const handleSelectedUserIdChange = bindUidChange(setSelectedUserId);

  const dateFilters = payslipsFilterDatesFromState(useAllTime, startDate, endDate);

  const orgListParams = {
    page,
    limit: pageSize,
    ...dateFilters,
    ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    ...(canViewOrg &&
    selectedUserId &&
    selectedUserId !== 'all' &&
    !Number.isNaN(Number(selectedUserId))
      ? { userId: Number(selectedUserId) }
      : {}),
  };

  useEffect(() => {
    setPage(1);
  }, [
    useAllTime,
    startDate,
    endDate,
    selectedStatus,
    selectedUserId,
    pageSize,
    canViewOrg,
  ]);

  const orgPayslipsQuery = usePayslips(orgListParams, {
    enabled: isTokenReady && !sessionSyncLoading && canViewOrg,
    skipErrorToast: true,
  });

  const userPayslipsQuery = useUserPayslips(currentUserId, {
    enabled:
      isTokenReady &&
      !sessionSyncLoading &&
      !canViewOrg &&
      currentUserId != null &&
      !Number.isNaN(currentUserId),
    skipErrorToast: true,
  });

  const userFilteredPayslips = useMemo(() => {
    const all = userPayslipsQuery.data?.data ?? [];
    return filterPayslipListItems(all, {
      ...dateFilters,
      ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    });
  }, [userPayslipsQuery.data?.data, dateFilters, selectedStatus]);

  const userPagination = useMemo(() => {
    const total = userFilteredPayslips.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      payslips: userFilteredPayslips.slice(start, start + pageSize),
      total,
      totalPages: total === 0 ? 0 : totalPages,
    };
  }, [userFilteredPayslips, page, pageSize]);

  const payslipsQuery = canViewOrg ? orgPayslipsQuery : userPayslipsQuery;
  const payslips = canViewOrg
    ? (orgPayslipsQuery.data?.data ?? [])
    : userPagination.payslips;
  const total = canViewOrg
    ? (orgPayslipsQuery.data?.meta?.total ?? 0)
    : userPagination.total;
  const totalPages = canViewOrg
    ? (orgPayslipsQuery.data?.meta?.totalPages ?? 0)
    : userPagination.totalPages;

  const onRangeChange = useCallback((range: { start: Date; end: Date }) => {
    setStartDate(range.start);
    setEndDate(range.end);
    setUseAllTime(false);
  }, []);

  const onResetDateRange = useCallback(() => {
    const { start, end } = utcMonthStartThroughToday();
    setStartDate(start);
    setEndDate(end);
    setUseAllTime(true);
  }, []);

  function handlePageSizeChange(size: PayslipsPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(PAYSLIPS_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  function handleView(payslip: PayslipListItem) {
    setSelectedPayslip(payslip);
    setDetailOpen(true);
  }

  async function handleDownload(payslip: PayslipListItem) {
    if (!payslip.documentUrl && !payslip.documentRef) {
      toast.error('No document available for this payslip');
      return;
    }
    setDownloadingId(payslip.uid);
    try {
      const doc = await getPayslipDocument(client, payslip.uid, { skipErrorToast: true });
      if (!doc?.url) {
        toast.error('No document available for this payslip');
        return;
      }
      const fileName = buildPayslipFileName(payslip, doc.fileName);
      const anchor = document.createElement('a');
      anchor.href = doc.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      toast.error('Could not download payslip. Try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const listError = payslipsQuery.isError ? payslipsQuery.error : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col overflow-hidden px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Payslips
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {canViewOrg
                ? 'View and download payslip documents for your organisation.'
                : 'View and download your payslip documents.'}
            </p>
          </div>
        </div>

        {listError != null ? (
          <QueryErrorBanner
            className="mb-4 shrink-0"
            message={getQueryErrorMessage(
              listError,
              'Could not load payslips. Try again.'
            )}
            onRetry={() => void payslipsQuery.refetch()}
          />
        ) : null}

        <div className="mb-4 shrink-0">
          <PayslipsFiltersBar
            canViewOrg={canViewOrg}
            users={users}
            startDate={startDate}
            endDate={endDate}
            useAllTime={useAllTime}
            selectedStatus={selectedStatus}
            selectedUserId={selectedUserId}
            onRangeChange={onRangeChange}
            onSetUseAllTime={setUseAllTime}
            onResetDateRange={onResetDateRange}
            onSelectedStatusChange={setSelectedStatus}
            onSelectedUserIdChange={handleSelectedUserIdChange}
            userSearchQuery={userSearchQuery}
            onUserSearchQueryChange={setUserSearchQuery}
            isUserSearchLoading={isUserSearchLoading}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <PayslipsTable
            payslips={payslips}
            isLoading={payslipsQuery.isLoading}
            showEmployeeColumn={canViewOrg}
            downloadingId={downloadingId}
            onView={handleView}
            onDownload={handleDownload}
          />
          <PayslipsListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isFetching={payslipsQuery.isFetching}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </main>

      <PayslipDetailDialog
        payslip={selectedPayslip}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        showEmployee={canViewOrg}
      />
    </div>
  );
}
