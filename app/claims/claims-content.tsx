'use client';

import { useMemo, useState, useEffect } from 'react';
import { useClaimsInfinite, useClaimGroups } from '@/api/hooks/use-claims';
import { useBranches } from '@/api/hooks/use-branches';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { BranchListItem } from '@/api/types/branch';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { ClaimsFiltersBar } from '@/app/claims/components/claims-filters-bar';
import { ClaimRowCard, ClaimRowCardSkeleton } from '@/app/claims/components/claim-row-card';
import { ClaimCreateDialog } from '@/app/claims/components/claim-create-dialog';
import { ClaimFoldersPanel } from '@/app/claims/components/claim-folders-panel';
import { Plus } from 'lucide-react';
import type { Claim } from '@/api/types/claims';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import {
  formatUtcYmd,
  utcMonthStartThroughToday,
} from '@/app/reports/utils/overview-daily-summary';

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

export function ClaimsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading } = useSessionSync();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [createdRange, setCreatedRange] = useState(() => {
    const { start, end } = utcMonthStartThroughToday();
    return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
  });
  const [groupFilter, setGroupFilter] = useState('all');

  const groupsQuery = useClaimGroups({ enabled: isTokenReady && !sessionSyncLoading });
  const groups = groupsQuery.data?.groups ?? [];

  const branchesQuery = useBranches({
    enabled: isTokenReady && !sessionSyncLoading,
  });
  const branchByUid = useMemo(() => {
    const map = new Map<number, BranchListItem>();
    for (const b of branchesQuery.data ?? []) {
      if (b.uid != null) map.set(b.uid, b);
    }
    return map;
  }, [branchesQuery.data]);

  const claimsQuery = useClaimsInfinite({
    enabled: isTokenReady && !sessionSyncLoading,
    status: statusFilter === 'all' ? undefined : statusFilter,
    createdFrom: createdRange.from || undefined,
    createdTo: createdRange.to || undefined,
    claimGroupUid:
      groupFilter === 'all' || Number.isNaN(Number.parseInt(groupFilter, 10))
        ? undefined
        : Number.parseInt(groupFilter, 10),
  });

  const rows = claimsQuery.rows;
  const filteredRows = useMemo(
    () => rows.filter((c) => matchesSearch(c, debouncedSearch)),
    [rows, debouncedSearch]
  );

  const err = claimsQuery.error;
  const statusCode = err ? getErrorStatus(err) : undefined;
  const errMsg = err ? getQueryErrorMessage(err, 'Could not load claims') : '';

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const isLoading = claimsQuery.isLoading;
  const isFetchingNext = claimsQuery.isFetchingNextPage;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-6xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8 lg:max-w-[88rem]">
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
          <Button
            className={cn(
              'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
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
          onClaimGroupChange={setGroupFilter}
        />

        <ClaimFoldersPanel
          groups={groups}
          isLoading={groupsQuery.isLoading}
          activeGroupUid={groupFilter}
          onSelectGroup={setGroupFilter}
        />

        {statusCode === 403 ? (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errMsg} Your organisation may need the claims feature enabled.
          </p>
        ) : err && statusCode !== 403 ? (
          <p className="mt-6 text-center text-sm text-destructive">{errMsg}</p>
        ) : null}

        <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ClaimRowCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {filteredRows.map((claim) => (
                <ClaimRowCard
                  key={claim.uid}
                  claim={claim}
                  branchByUid={branchByUid}
                />
              ))}
            </div>
          )}
          {!isLoading && !err && filteredRows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              No claims match your filters.
            </p>
          ) : null}
          {claimsQuery.hasNextPage ? (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 bg-white"
                disabled={isFetchingNext}
                onClick={() => claimsQuery.fetchNextPage()}
              >
                {isFetchingNext ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      <ClaimCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
