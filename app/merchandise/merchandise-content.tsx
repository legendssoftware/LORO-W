'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { useBranches } from '@/api/hooks/use-branches';
import { useSearchableUsersList } from '@/api/hooks/use-searchable-users-list';
import { useJournals } from '@/api/hooks/use-journals';
import { canAccessMerchandise } from '@/lib/access';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import {
  createDefaultListDateRange,
  listDateRangeQuery,
  type ListDateRangeValue,
} from '@/components/filters/list-date-range-filter';
import {
  readStoredPageSize,
  VisitsListPagination,
  type VisitsPageSize,
} from '@/app/visits/components/visits-list-pagination';
import { MerchandiseCreateDialog } from './components/merchandise-create-dialog';
import { MerchandiseFiltersBar } from './components/merchandise-filters-bar';
import { MerchandiseGroupedList } from './components/merchandise-grouped-list';

const primaryClass =
  'h-9 shrink-0 gap-2 border-0 bg-violet-600 px-4 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500 [&_svg]:text-white';

const MERCHANDISE_PAGE_SIZE_KEY = 'loro:merchandise-page-size';

export function MerchandiseContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<ListDateRangeValue>(createDefaultListDateRange);
  const [branchId, setBranchId] = useState('all');
  const [userUidFilter, setUserUidFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() =>
    readStoredPageSize(MERCHANDISE_PAGE_SIZE_KEY)
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const ready = isTokenReady && !isSyncing;
  const branchesQuery = useBranches({ enabled: ready });
  const {
    users: pickerUsers,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({ enabled: ready, limit: 100 });

  const dateQuery = listDateRangeQuery(dateRange);
  const authorId = userUidFilter === 'all' ? undefined : Number(userUidFilter);
  const selectedBranch = branchId === 'all' ? undefined : Number(branchId);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    statusFilter,
    branchId,
    userUidFilter,
    dateQuery.startDate,
    dateQuery.endDate,
    pageSize,
  ]);

  const canCreate = canAccessMerchandise(backendUserData?.accessLevel);
  const listQuery = useJournals({
    enabled: ready,
    status: statusFilter,
    search: debouncedSearch,
    page,
    limit: pageSize,
    authorId: authorId != null && authorId > 0 ? authorId : undefined,
    branchId: selectedBranch != null && selectedBranch > 0 ? selectedBranch : undefined,
    startDate: dateQuery.startDate,
    endDate: dateQuery.endDate,
  });

  if (!ready) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const err = listQuery.error;
  const statusCode = err ? getErrorStatus(err) : undefined;
  const errMsg = err ? getQueryErrorMessage(err, 'Could not load merchandise') : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div
          data-tour="merchandise-page-header"
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Merchandise Management
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track and manage merchandise inventories and transactions
            </p>
          </div>
          {canCreate ? (
            <Button
              data-tour="merchandise-create-button"
              className={primaryClass}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              New merchandise
            </Button>
          ) : null}
        </div>

        <div data-tour="merchandise-toolbar">
          <MerchandiseFiltersBar
            status={statusFilter}
            onStatusChange={setStatusFilter}
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            branches={branchesQuery.data ?? []}
            selectedBranchId={branchId}
            onBranchChange={setBranchId}
            users={pickerUsers}
            selectedUserUid={userUidFilter}
            onUserUidChange={bindUidChange(setUserUidFilter)}
            userSearchQuery={userSearchQuery}
            onUserSearchQueryChange={setUserSearchQuery}
            isUserSearchLoading={isUserSearchLoading}
          />
        </div>

        <div data-tour="merchandise-list">
          {statusCode === 403 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {errMsg}
            </p>
          ) : err ? (
            <p className="text-center text-sm text-destructive">{errMsg}</p>
          ) : listQuery.isLoading ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : (
            <MerchandiseGroupedList journals={listQuery.rows} />
          )}
        </div>

        <VisitsListPagination
          page={page}
          totalPages={listQuery.totalPages}
          total={listQuery.total}
          pageSize={pageSize}
          isFetching={listQuery.isFetching && !listQuery.isLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            try {
              localStorage.setItem(MERCHANDISE_PAGE_SIZE_KEY, String(size));
            } catch {
              /* ignore */
            }
          }}
          dataTour="merchandise-pagination"
          className="mt-4 rounded-lg border border-border"
        />
      </main>

      <MerchandiseCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
