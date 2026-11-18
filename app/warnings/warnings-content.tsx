'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWarningsList } from '@/api/hooks/use-warnings';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import type { WarningRecord } from '@/api/types/warnings';
import { WarningDetailDialog } from '@/app/warnings/components/warning-detail-dialog';
import { WarningFormDialog } from '@/app/warnings/components/warning-form-dialog';
import { WarningRowCard, WarningRowCardSkeleton, warningPersonName } from '@/app/warnings/components/warning-row-card';
import { WarningsFiltersBar } from '@/app/warnings/components/warnings-filters-bar';
import { normalizeWarningsList } from '@/api/endpoints/warnings';
import { LoadingSpinner } from '@/components/loading-spinner';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Button } from '@/components/ui/button';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const primaryButtonClass = cn(
  'h-9 shrink-0 gap-2 border-0 !rounded px-4',
  'bg-violet-600 text-white hover:bg-violet-700',
  'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
  '[&_svg]:text-white focus-visible:ring-violet-500/40'
);

function matchesSearch(warning: WarningRecord, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    warning.reason.toLowerCase().includes(needle) ||
    warning.severity.toLowerCase().includes(needle) ||
    warning.status.toLowerCase().includes(needle) ||
    warningPersonName(warning.owner).toLowerCase().includes(needle) ||
    warningPersonName(warning.issuedBy).toLowerCase().includes(needle)
  );
}

export function WarningsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: sessionSyncLoading } = useSessionSync();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WarningRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WarningRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const enabled = isTokenReady && !sessionSyncLoading;
  const listQuery = useWarningsList(
    {
      page,
      limit: PAGE_SIZE,
      status: statusFilter === 'all' ? undefined : statusFilter,
    },
    { enabled }
  );

  const rows = useMemo(() => {
    const source = listQuery.data ? normalizeWarningsList(listQuery.data) : [];
    return source.filter((warning) => matchesSearch(warning, debouncedSearch));
  }, [listQuery.data, debouncedSearch]);

  if (!isTokenReady || sessionSyncLoading) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const listError = listQuery.error
    ? getErrorStatus(listQuery.error) === 403
      ? `${getQueryErrorMessage(listQuery.error, 'Could not load warnings')} Warnings may not be enabled for this organisation.`
      : getQueryErrorMessage(listQuery.error, 'Could not load warnings')
    : '';
  const meta = listQuery.data?.meta;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Warnings</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Formal HR warnings for the organisation. Filter by status, then open a record to edit or delete it.
            </p>
          </div>
          <Button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Issue warning
          </Button>
        </div>

        <WarningsFiltersBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {listError ? (
          <QueryErrorBanner className="mb-4" message={listError} onRetry={() => listQuery.refetch()} />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {listQuery.isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <WarningRowCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((warning) => (
                <WarningRowCard
                  key={warning.uid}
                  warning={warning}
                  onOpen={(item) => {
                    setSelected(item);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
          {!listQuery.isLoading && !listQuery.error && rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No warnings match your filters.</p>
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

      <WarningFormDialog open={formOpen} onOpenChange={setFormOpen} warning={editing} />
      <WarningDetailDialog
        warning={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(item) => {
          setDetailOpen(false);
          setEditing(item);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
