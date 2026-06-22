'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useTokenReady,
  useCompetitorsInfinite,
  useSessionSync,
} from '@/api/hooks';
import type { CompetitorListItem } from '@/api/types/competitors';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { XIcon } from '@/lib/icons';
import {
  COMPETITOR_STATUS_FILTER_OPTIONS,
  type CompetitorDirectFilterValue,
  type CompetitorStatusFilterValue,
  type CompetitorThreatFilterValue,
  competitorDirectFilterToBool,
  competitorThreatFilterToNumber,
} from '@/lib/competitor-filter-utils';
import { canDeleteCompetitors, canManageCompetitors } from '@/lib/access';
import { CompetitorCard, CompetitorCardSkeleton } from './components/competitor-card';
import { CompetitorDetailDialog } from './components/competitor-detail-dialog';
import { CompetitorFormDialog } from './components/competitor-form-dialog';
import { ImportCompetitorsModal } from './components/import-competitors-modal';
import { cn } from '@/lib/utils';
import { Link2, ListFilter, Plus, ShieldAlert, Upload } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SEARCH_DEBOUNCE_MS = 350;

export function CompetitorsContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const canEdit = canManageCompetitors(profile?.accessLevel);
  const canDel = canDeleteCompetitors(profile?.accessLevel);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const [statusFilter, setStatusFilter] = useState<CompetitorStatusFilterValue>('all');
  const [directFilter, setDirectFilter] = useState<CompetitorDirectFilterValue>('all');
  const [threatFilter, setThreatFilter] = useState<CompetitorThreatFilterValue>('all');

  const [detailItem, setDetailItem] = useState<CompetitorListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formCompetitorId, setFormCompetitorId] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const statusParam = statusFilter === 'all' ? undefined : statusFilter;
  const isDirectParam = competitorDirectFilterToBool(directFilter);
  const minThreat = competitorThreatFilterToNumber(threatFilter);

  const competitorsQuery = useCompetitorsInfinite({
    name: debouncedSearch || undefined,
    status: statusParam,
    isDirect: isDirectParam,
    minThreatLevel: minThreat,
    enabled: isTokenReady,
  });

  const rows = competitorsQuery.data ?? [];
  const isLoading = competitorsQuery.isLoading;
  const isFetchingNext = competitorsQuery.isFetchingNextPage;

  const statusPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      COMPETITOR_STATUS_FILTER_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
        value: o.value,
        label: o.label,
        icon: <ListFilter className="size-4 shrink-0" />,
      })),
    []
  );

  const directPickerOptions = useMemo<SearchableOptionRow[]>(
    () => [
      {
        value: 'direct',
        label: 'Direct only',
        icon: <Link2 className="size-4 shrink-0" />,
      },
      {
        value: 'indirect',
        label: 'Indirect only',
        icon: <Link2 className="size-4 shrink-0" />,
      },
    ],
    []
  );

  const threatPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      (['1', '2', '3', '4', '5'] as const).map((v) => ({
        value: v,
        label:
          v === '5'
            ? 'Threat 5 only'
            : `Threat ≥ ${v}`,
        icon: <ShieldAlert className="size-4 shrink-0" />,
      })),
    []
  );

  if (!isTokenReady) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  function openCreate() {
    setFormMode('create');
    setFormCompetitorId(null);
    setFormOpen(true);
  }

  function openEdit(id: number) {
    setDetailItem(null);
    setFormMode('edit');
    setFormCompetitorId(id);
    setFormOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Competitors</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track rivals, threat levels and locations alongside your clients.
            </p>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 items-center gap-2 self-start">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 border-border bg-background text-foreground hover:bg-accent"
                    onClick={() => setImportModalOpen(true)}
                    aria-label="Import competitors"
                  >
                    <Upload className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import competitors</TooltipContent>
              </Tooltip>
              <Button
                className="h-9 shrink-0 gap-2 bg-violet-600 text-white hover:bg-violet-700 [&_svg]:text-white focus-visible:ring-violet-500/40"
                onClick={openCreate}
              >
                <Plus className="size-4" />
                Add competitor
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <SearchableOptionListPicker
                selectedValue={statusFilter}
                onValueChange={(v) => setStatusFilter(v as CompetitorStatusFilterValue)}
                options={statusPickerOptions}
                placeholderLabelWhenAll="All statuses"
                searchPlaceholder="Search statuses…"
                emptyMessage="No status found."
                triggerIcon={<ListFilter className="size-4 shrink-0" />}
                triggerClassName="h-9 min-w-0 w-full shrink-0 sm:w-[170px]"
              />
              {statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
                  aria-label="Clear status filter"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <SearchableOptionListPicker
                selectedValue={directFilter}
                onValueChange={(v) => setDirectFilter(v as CompetitorDirectFilterValue)}
                options={directPickerOptions}
                placeholderLabelWhenAll="All types"
                searchPlaceholder="Search types…"
                emptyMessage="No type found."
                triggerIcon={<Link2 className="size-4 shrink-0" />}
                triggerClassName="h-9 min-w-0 w-full shrink-0 sm:w-[150px]"
              />
              {directFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setDirectFilter('all')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
                  aria-label="Clear type filter"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <SearchableOptionListPicker
                selectedValue={threatFilter}
                onValueChange={(v) => setThreatFilter(v as CompetitorThreatFilterValue)}
                options={threatPickerOptions}
                placeholderLabelWhenAll="Any threat level"
                searchPlaceholder="Search threat levels…"
                emptyMessage="No option found."
                triggerIcon={<ShieldAlert className="size-4 shrink-0" />}
                triggerClassName="h-9 min-w-0 w-full shrink-0 sm:w-[160px]"
              />
              {threatFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setThreatFilter('all')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
                  aria-label="Clear threat filter"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center lg:w-auto">
            <Input
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(filterToolbarSearchInputClassName, 'sm:max-w-[240px]')}
              aria-label="Search competitors by name"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <CompetitorCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((row) => (
                <CompetitorCard
                  key={row.uid}
                  competitor={row}
                  onClick={() => setDetailItem(row)}
                />
              ))}
            </div>
          )}
          {!isLoading && rows.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No competitors match your filters.</p>
          )}
          {competitorsQuery.hasNextPage ? (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background"
                disabled={isFetchingNext}
                onClick={() => competitorsQuery.fetchNextPage()}
              >
                {isFetchingNext ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      <CompetitorDetailDialog
        listItem={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={(id) => openEdit(id)}
        canEdit={canEdit}
        canDelete={canDel}
      />

      <CompetitorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        competitorId={formCompetitorId}
      />

      <ImportCompetitorsModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => void competitorsQuery.refetch()}
      />
    </div>
  );
}