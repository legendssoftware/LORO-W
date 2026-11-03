'use client';

import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  useClaimsInfinite,
  useClaimGroups,
  useClaimsSummary,
} from '@/api/hooks/use-claims';
import { getClaims } from '@/api/endpoints/claims';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useBranches } from '@/api/hooks/use-branches';
import { useSearchableUsersList } from '@/api/hooks/use-searchable-users-list';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { BranchListItem } from '@/api/types/branch';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import {
  ClaimsFiltersBar,
  type ClaimsPageViewMode,
} from '@/app/claims/components/claims-filters-bar';
import { ClaimCreateDialog } from '@/app/claims/components/claim-create-dialog';
import { ClaimFoldersPanel } from '@/app/claims/components/claim-folders-panel';
import { ClaimsSummaryCards } from '@/app/claims/components/claims-summary-cards';
import {
  ClaimsGroupedList,
  ClaimsGroupedListSkeleton,
} from '@/app/claims/components/claims-grouped-list';
import type { ClaimsCurrencyView } from '@/app/claims/lib/claim-display';
import { exportClaimsPerUserCsv } from '@/app/claims/lib/export-claims-csv';
import { Download, Loader2, Plus } from 'lucide-react';
import type { Claim } from '@/api/types/claims';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { canViewOrgClaimsList } from '@/lib/access';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/session-store';

function matchesSearch(claim: Claim, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  const ref = (claim.claimRef || String(claim.uid)).toLowerCase();
  const cat = (claim.category || '').toLowerCase();
  const amt = String(claim.amount ?? '').toLowerCase();
  const owner =
    `${claim.owner?.name ?? ''} ${claim.owner?.surname ?? ''} ${claim.owner?.email ?? ''}`.toLowerCase();
  return (
    ref.includes(s) ||
    cat.includes(s) ||
    amt.includes(s) ||
    owner.includes(s)
  );
}

function parseOwnerUid(userFilter: string): number | undefined {
  if (userFilter === 'all' || userFilter === '') return undefined;
  const parsed = Number.parseInt(userFilter, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return parsed;
}

const EXPORT_PAGE_SIZE = 100;

export function ClaimsContent() {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading, backendUserData } = useSessionSync();
  const profileAccessLevel = useSessionStore((s) => s.profileData?.accessLevel);
  const accessLevel =
    (typeof backendUserData?.accessLevel === 'string'
      ? backendUserData.accessLevel
      : undefined) ??
    (typeof profileAccessLevel === 'string' ? profileAccessLevel : undefined);
  const showUserFilter = canViewOrgClaimsList(accessLevel);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ClaimsPageViewMode>('list');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [createdRange, setCreatedRange] = useState({ from: '', to: '' });
  const [groupFilter, setGroupFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [currencyView, setCurrencyView] = useState<ClaimsCurrencyView>('original');

  const groupsQuery = useClaimGroups({ enabled: isTokenReady && !sessionSyncLoading });
  const groups = groupsQuery.data?.groups ?? [];

  const branchesQuery = useBranches({
    enabled: isTokenReady && !sessionSyncLoading,
  });
  const {
    users,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({
    enabled: isTokenReady && !sessionSyncLoading && showUserFilter,
    limit: 100,
  });
  const handleUserFilterChange = bindUidChange(setUserFilter);
  const branchByUid = useMemo(() => {
    const map = new Map<number, BranchListItem>();
    for (const b of branchesQuery.data ?? []) {
      if (b.uid != null) map.set(b.uid, b);
    }
    return map;
  }, [branchesQuery.data]);

  const claimGroupUid =
    groupFilter === 'all' || Number.isNaN(Number.parseInt(groupFilter, 10))
      ? undefined
      : Number.parseInt(groupFilter, 10);
  const folderSelected = claimGroupUid != null;
  const createdFrom = folderSelected ? undefined : createdRange.from || undefined;
  const createdTo = folderSelected ? undefined : createdRange.to || undefined;

  const ownerUid = showUserFilter ? parseOwnerUid(userFilter) : undefined;

  const claimsQuery = useClaimsInfinite({
    enabled: isTokenReady && !sessionSyncLoading,
    status: statusFilter === 'all' ? undefined : statusFilter,
    createdFrom,
    createdTo,
    claimGroupUid,
    ownerUid,
  });

  const summaryQuery = useClaimsSummary(
    {},
    { enabled: isTokenReady && !sessionSyncLoading }
  );

  const rows = claimsQuery.rows;
  const filteredRows = useMemo(
    () => rows.filter((c) => matchesSearch(c, debouncedSearch)),
    [rows, debouncedSearch]
  );

  const err = claimsQuery.error;
  const statusCode = err ? getErrorStatus(err) : undefined;
  const errMsg = err ? getQueryErrorMessage(err, 'Could not load claims') : '';

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      let claims = filteredRows;
      if (showUserFilter) {
        const collected: Claim[] = [];
        for (let page = 1; page <= 500; page += 1) {
          const result = await getClaims(client, {
            page,
            limit: EXPORT_PAGE_SIZE,
            status: statusFilter === 'all' ? undefined : statusFilter,
            createdFrom,
            createdTo,
            claimGroupUid,
            ownerUid,
          });
          const batch = result.data ?? [];
          collected.push(...batch);
          const totalPages = result.meta?.totalPages ?? 1;
          if (page >= totalPages || batch.length === 0) break;
        }
        claims = collected.filter((claim) =>
          matchesSearch(claim, debouncedSearch)
        );
      }
      if (claims.length === 0) {
        toast.error('No claims to export');
        return;
      }
      exportClaimsPerUserCsv(claims, groups);
    } catch (error) {
      toast.error(getQueryErrorMessage(error, 'Could not export claims'));
    } finally {
      setExporting(false);
    }
  }

  function handleSelectGroup(uid: string) {
    setGroupFilter(uid);
    if (uid !== 'all') setViewMode('list');
  }

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const isLoading = claimsQuery.isLoading;
  const isFetchingNext = claimsQuery.isFetchingNextPage;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="claims-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Claims
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Submit expenses, attach receipts, and track approvals to payment.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 px-4"
              disabled={exporting}
              onClick={() => {
                void handleExport();
              }}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export
            </Button>
            <Button
              className={cn(
                'h-9 shrink-0 gap-2 border-0 !rounded px-4',
                'bg-violet-600 text-white hover:bg-violet-700',
                'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
                '[&_svg]:text-white focus-visible:ring-violet-500/40'
              )}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              New claim
            </Button>
          </div>
        </div>

        <ClaimsSummaryCards
          summary={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
        />

        <ClaimsFiltersBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          createdFrom={createdRange.from}
          createdTo={createdRange.to}
          onCreatedFromChange={(v) =>
            setCreatedRange((r) => ({ ...r, from: v }))
          }
          onCreatedToChange={(v) => setCreatedRange((r) => ({ ...r, to: v }))}
          groups={groups}
          claimGroupUid={groupFilter}
          onClaimGroupChange={handleSelectGroup}
          currencyView={currencyView}
          onCurrencyViewChange={setCurrencyView}
          showUserFilter={showUserFilter}
          userFilter={userFilter}
          onUserFilterChange={handleUserFilterChange}
          users={users}
          branches={branchesQuery.data ?? []}
          userSearchQuery={userSearchQuery}
          onUserSearchQueryChange={setUserSearchQuery}
          isUserSearchLoading={isUserSearchLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {viewMode === 'grid' ? (
          <ClaimFoldersPanel
            groups={groups}
            isLoading={groupsQuery.isLoading}
            activeGroupUid={groupFilter}
            onSelectGroup={handleSelectGroup}
          />
        ) : null}

        {statusCode === 403 ? (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errMsg} Your organisation may need the claims feature enabled.
          </p>
        ) : err && statusCode !== 403 ? (
          <p className="mt-6 text-center text-sm text-destructive">{errMsg}</p>
        ) : null}

        {viewMode === 'list' ? (
          <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
            {isLoading ? (
              <ClaimsGroupedListSkeleton />
            ) : (
              <ClaimsGroupedList
                claims={filteredRows}
                groups={groups}
                byGroup={summaryQuery.data?.byGroup}
                activeGroupUid={groupFilter}
                branchByUid={branchByUid}
                currencyView={currencyView}
                groupByOwner={showUserFilter}
              />
            )}
            {claimsQuery.hasNextPage ? (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border bg-background"
                  disabled={isFetchingNext}
                  onClick={() => claimsQuery.fetchNextPage()}
                >
                  {isFetchingNext ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>

      <ClaimCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
