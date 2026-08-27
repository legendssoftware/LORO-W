'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApprovals, useApprovalStats } from '@/api/hooks/use-approvals';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { Approval } from '@/api/types/approvals';
import { LoadingSpinner } from '@/components/loading-spinner';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Card, CardContent } from '@/components/ui/card';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { canManageApprovals } from '@/lib/access';
import { useSessionStore } from '@/store/session-store';
import { ApprovalDetailDialog } from './components/approval-detail-dialog';
import {
  ApprovalRowCard,
  ApprovalRowCardSkeleton,
} from './components/approval-row-card';
import { ApprovalsFiltersBar } from './components/approvals-filters-bar';

function matchesSearch(approval: Approval, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const hireName = String(approval.metadata?.hireName ?? '').toLowerCase();
  const hireEmail = String(approval.metadata?.hireEmail ?? '').toLowerCase();
  return (
    approval.title.toLowerCase().includes(needle) ||
    (approval.approvalReference ?? '').toLowerCase().includes(needle) ||
    (approval.description ?? '').toLowerCase().includes(needle) ||
    hireName.includes(needle) ||
    hireEmail.includes(needle)
  );
}

export function ApprovalsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading } = useSessionSync();
  const accessLevel = useSessionStore((state) => state.profileData?.accessLevel);
  const canAct = canManageApprovals(accessLevel);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Approval | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const enabled = isTokenReady && !sessionSyncLoading;
  const listQuery = useApprovals(
    {
      page: 1,
      limit: 50,
      status: statusFilter === 'all' ? undefined : statusFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    },
    { enabled }
  );
  const statsQuery = useApprovalStats({ enabled });

  const rows = useMemo(() => {
    const data = listQuery.data?.data ?? [];
    return data.filter((approval) => matchesSearch(approval, debouncedSearch));
  }, [listQuery.data?.data, debouncedSearch]);

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const pending = statsQuery.data?.summary.pending ?? 0;
  const overdue = statsQuery.data?.summary.overdue ?? 0;
  const listError = listQuery.error
    ? getQueryErrorMessage(listQuery.error, 'Could not load approvals')
    : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 shrink-0">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Approvals</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Review pending requests, inspect employee intake forms, and approve or reject from the web.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold">{pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="mt-1 text-2xl font-semibold">{overdue}</p>
            </CardContent>
          </Card>
        </div>

        <ApprovalsFiltersBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
        />

        {listError ? (
          <QueryErrorBanner
            className="mt-6"
            message={listError}
            onRetry={() => listQuery.refetch()}
          />
        ) : null}

        <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {listQuery.isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ApprovalRowCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((approval) => (
                <ApprovalRowCard
                  key={approval.uid}
                  approval={approval}
                  onOpen={(item) => {
                    setSelected(item);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
          {!listQuery.isLoading && !listQuery.error && rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              No approvals match your filters.
            </p>
          ) : null}
        </div>
      </main>

      <ApprovalDetailDialog
        approval={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canAct={canAct}
      />
    </div>
  );
}
