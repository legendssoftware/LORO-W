'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Plus } from 'lucide-react';
import { useBranches } from '@/api/hooks/use-branches';
import { useLeaveHistory, useLeaveList, useLeaveReport } from '@/api/hooks/use-leaves';
import { useSearchableUsersList } from '@/api/hooks/use-searchable-users-list';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { LeaveRecord } from '@/api/types/leave';
import { LeaveDetailDialog } from '@/app/leave/components/leave-detail-dialog';
import { LeaveFiltersBar } from '@/app/leave/components/leave-filters-bar';
import { LeaveRequestDialog } from '@/app/leave/components/leave-request-dialog';
import { LeaveRowCard, LeaveRowCardSkeleton } from '@/app/leave/components/leave-row-card';
import {
  formatLeaveStatus,
  leaveOverlapsRange,
  leavePersonName,
  leaveRowsFromList,
} from '@/app/leave/lib/leave-display';
import { LoadingSpinner } from '@/components/loading-spinner';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Button } from '@/components/ui/button';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { canDecideLeave, getReportsDataScope } from '@/lib/access';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/session-store';

const PAGE_SIZE = 20;

const primaryButtonClass = cn(
  'h-9 shrink-0 gap-2 border-0 !rounded px-4',
  'bg-violet-600 text-white hover:bg-violet-700',
  'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
  '[&_svg]:text-white focus-visible:ring-violet-500/40'
);

function matchesSearch(leave: LeaveRecord, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    formatLeaveStatus(leave.status).toLowerCase().includes(needle) ||
    leave.leaveType.toLowerCase().includes(needle) ||
    (leave.motivation ?? '').toLowerCase().includes(needle) ||
    leavePersonName(leave.owner).toLowerCase().includes(needle) ||
    String(leave.uid).includes(needle)
  );
}

function leaveLoadError(error: unknown): string {
  const message = getQueryErrorMessage(error, 'Could not load leave requests');
  if (getErrorStatus(error) === 403 && !message.toLowerCase().includes('enabled')) {
    return `${message} Leave may not be enabled for this organisation.`;
  }
  return message;
}

export function LeaveContent() {
  const { userId } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading, backendUserData } = useSessionSync();
  const profile = useSessionStore((state) => state.profileData);
  const accessLevel =
    (typeof backendUserData?.accessLevel === 'string' ? backendUserData.accessLevel : undefined) ??
    (typeof profile?.accessLevel === 'string' ? profile.accessLevel : undefined);
  const canDecide = canDecideLeave(accessLevel);
  // Person filter is for people who can see more than their own requests.
  const showPersonFilter =
    canDecide || getReportsDataScope(accessLevel, backendUserData ?? profile) !== 'self';
  const viewer = {
    uid: backendUserData?.uid ?? profile?.uid,
    clerkUserId: backendUserData?.clerkUserId ?? profile?.clerkUserId ?? userId,
  };

  const [requestOpen, setRequestOpen] = useState(false);
  const [selected, setSelected] = useState<LeaveRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [personRef, setPersonRef] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate, personRef]);

  const enabled = isTokenReady && !sessionSyncLoading;
  const branchesQuery = useBranches({ enabled: enabled && showPersonFilter });
  const {
    users,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({
    enabled: enabled && showPersonFilter,
    limit: 100,
  });

  const handleUserFilterChange = bindUidChange((uid: string) => {
    setUserFilter(uid);
    if (uid === 'all' || uid === '' || uid === 'none') {
      setPersonRef(null);
      return;
    }
    const person = users.find((row) => String(row.uid) === uid);
    // History endpoint accepts a Clerk id or a numeric uid. The list endpoint ignores ownerUid.
    setPersonRef(person?.clerkUserId?.trim() || uid);
  });

  const listQuery = useLeaveList(
    {
      page,
      limit: PAGE_SIZE,
      status: statusFilter === 'all' ? undefined : statusFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: enabled && !personRef }
  );
  const historyQuery = useLeaveHistory(personRef, { enabled: enabled && !!personRef });
  const reportQuery = useLeaveReport(
    { from: startDate, to: endDate },
    { enabled: enabled && !personRef && Boolean(startDate && endDate) }
  );

  const rows = useMemo(() => {
    const source = personRef
      ? (historyQuery.data?.leaves ?? [])
      : leaveRowsFromList(listQuery.data ?? {});
    return source.filter((leave) => {
      if (personRef && statusFilter !== 'all' && leave.status !== statusFilter) return false;
      if (personRef && !leaveOverlapsRange(leave, startDate, endDate)) return false;
      return matchesSearch(leave, debouncedSearch);
    });
  }, [
    personRef,
    historyQuery.data?.leaves,
    listQuery.data,
    statusFilter,
    startDate,
    endDate,
    debouncedSearch,
  ]);

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const activeError = personRef ? historyQuery.error : listQuery.error;
  const isLoading = personRef ? historyQuery.isLoading : listQuery.isLoading;
  const listError = activeError ? leaveLoadError(activeError) : '';
  const meta = personRef ? undefined : listQuery.data?.meta;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Leave</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Request time off, then filter by person, status, and dates. Open a request to approve, reject, or cancel.
            </p>
          </div>
          <Button type="button" className={primaryButtonClass} onClick={() => setRequestOpen(true)}>
            <Plus className="size-4" />
            Request leave
          </Button>
        </div>

        <LeaveFiltersBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          showPersonFilter={showPersonFilter}
          userFilter={userFilter}
          onUserFilterChange={handleUserFilterChange}
          users={users}
          branches={branchesQuery.data ?? []}
          userSearchQuery={userSearchQuery}
          onUserSearchQueryChange={setUserSearchQuery}
          isUserSearchLoading={isUserSearchLoading}
        />

        {reportQuery.data ? (
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border border-border px-2 py-1">
              {reportQuery.data.total} in this date range
            </span>
            {reportQuery.data.byStatus.map((bucket) => (
              <span key={bucket.name} className="rounded-md border border-border px-2 py-1">
                {formatLeaveStatus(bucket.name)} {bucket.value}
              </span>
            ))}
          </div>
        ) : null}

        {listError ? (
          <QueryErrorBanner
            className="mb-4"
            message={listError}
            onRetry={() => {
              if (personRef) void historyQuery.refetch();
              else void listQuery.refetch();
            }}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <LeaveRowCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((leave) => (
                <LeaveRowCard
                  key={leave.uid}
                  leave={leave}
                  onOpen={(item) => {
                    setSelected(item);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
          {!isLoading && !activeError && rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No leave requests match your filters.</p>
          ) : null}
        </div>

        {meta && meta.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || listQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= meta.totalPages || listQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      <LeaveRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
      <LeaveDetailDialog
        leave={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canDecide={canDecide}
        viewer={viewer}
      />
    </div>
  );
}
