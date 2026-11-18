'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApprovals } from '@/api/hooks/use-approvals';
import { useApiClient } from '@/api/hooks/use-api-client';
import { createApproval, getMyApprovalRequests } from '@/api/endpoints/approvals';
import { Button } from '@/components/ui/button';
import { Inbox, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { Approval } from '@/api/types/approvals';
import { LoadingSpinner } from '@/components/loading-spinner';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { canManageApprovals } from '@/lib/access';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/session-store';
import { useAuth } from '@clerk/nextjs';
import { useApprovalsWebSocket } from '@/api/hooks/use-approvals-websocket';
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
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading } = useSessionSync();
  const { isSignedIn, getToken } = useAuth();
  const accessLevel = useSessionStore((state) => state.profileData?.accessLevel);
  const approvableTypes = useSessionStore((state) => state.profileData?.approvableTypes);
  const organisationRef = useSessionStore((state) => state.profileData?.organisationRef);
  const userId = useSessionStore((state) => state.profileData?.uid);
  const canAct = canManageApprovals(accessLevel, approvableTypes);

  useApprovalsWebSocket({
    getToken,
    isSignedIn: Boolean(isSignedIn),
    organisationRef,
    userId,
    enabled: isTokenReady && !sessionSyncLoading,
  });

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
  const rows = useMemo(() => {
    const data = listQuery.data?.data ?? [];
    return data.filter((approval) => matchesSearch(approval, debouncedSearch));
  }, [listQuery.data?.data, debouncedSearch]);

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const listError = listQuery.error
    ? getQueryErrorMessage(listQuery.error, 'Could not load approvals')
    : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div className="mb-6 shrink-0" data-tour="approvals-page-header">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Approvals</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Review pending requests, inspect employee intake forms, and approve or reject from the web.
          </p>
        </div>

        <div data-tour="approvals-toolbar">
        <ApprovalsFiltersBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          actions={
            <>
              <Button type="button" size="sm" variant="outline" className="h-9 shrink-0 gap-2" onClick={() => {
                void createApproval(client, { title: 'Web request', type: 'GENERAL' }).then(() => toast.success('Request created'), () => toast.error('Could not create a request'));
              }}>
                <Plus className="size-4" />
                New request
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-9 shrink-0 gap-2" onClick={() => {
                void getMyApprovalRequests(client).then(() => toast.success('My requests loaded'), () => toast.error('Could not load my requests'));
              }}>
                <Inbox className="size-4" />
                My requests
              </Button>
            </>
          }
        />
        </div>

        {listError ? (
          <div data-tour="approvals-settled">
          <QueryErrorBanner
            className="mt-6"
            message={listError}
            onRetry={() => listQuery.refetch()}
          />
          </div>
        ) : null}

        <div
          className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto"
          {...(listQuery.isLoading ? {} : { 'data-tour': 'approvals-list' })}
        >
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
