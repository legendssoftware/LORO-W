'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useTokenReady,
  useCompetitorsInfinite,
  useSessionSync,
} from '@/api/hooks';
import type { CompetitorListItem } from '@/api/types/competitors';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { XIcon } from '@/lib/icons';
import { statusFilterIconClass } from '@/lib/status-filter-icon';
import { cn } from '@/lib/utils';
import {
  COMPETITOR_STATUS_FILTER_OPTIONS,
  type CompetitorDirectFilterValue,
  type CompetitorStatusFilterValue,
  type CompetitorThreatFilterValue,
  competitorDirectFilterToBool,
  competitorThreatFilterToNumber,
} from '@/lib/competitor-filter-utils';
import { canDeleteCompetitors, canManageCompetitors } from '@/lib/access';
import { useTranslation } from 'react-i18next';
import { CompetitorCard, CompetitorCardSkeleton } from './components/competitor-card';
import { CompetitorDetailDialog } from './components/competitor-detail-dialog';
import { CompetitorFormDialog } from './components/competitor-form-dialog';
import { ImportCompetitorsModal } from './components/import-competitors-modal';
import { appPageMainClass } from '@/lib/page-shell';
import { Link2, ListFilter, Plus, ShieldAlert, Upload } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SEARCH_DEBOUNCE_MS = 350;

export function CompetitorsContent() {
  const { t } = useTranslation('screens');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const canEdit = canManageCompetitors(profile?.accessLevel);
  const canDel = canDeleteCompetitors(profile?.accessLevel);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const [statusFilter, setStatusFilter] = useState<CompetitorStatusFilterValue>('all');
  const [directFilter, setDirectFilter] = useState<CompetitorDirectFilterValue>('all');
  const [threatFilter, setThreatFilter] = useState<CompetitorThreatFilterValue>('all');

  const [detailItem, setDetailItem] = useState<CompetitorListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formCompetitorId, setFormCompetitorId] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  /** Deep-link: /competitors?edit=123 opens the edit dialog. */
  useEffect(() => {
    if (!canEdit || !isTokenReady) return;
    const raw = searchParams.get('edit');
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    setDetailItem(null);
    setFormMode('edit');
    setFormCompetitorId(id);
    setFormOpen(true);
    router.replace('/competitors', { scroll: false });
  }, [searchParams, canEdit, isTokenReady, router]);

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
        label: t(o.labelKey),
        icon: (
          <ListFilter className={cn('size-4 shrink-0', statusFilterIconClass(o.value))} />
        ),
      })),
    [t]
  );

  const directPickerOptions = useMemo<SearchableOptionRow[]>(
    () => [
      {
        value: 'direct',
        label: t('chrome.competitors.directOnly'),
        icon: <Link2 className="size-4 shrink-0" />,
      },
      {
        value: 'indirect',
        label: t('chrome.competitors.indirectOnly'),
        icon: <Link2 className="size-4 shrink-0" />,
      },
    ],
    [t]
  );

  const threatPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      (['1', '2', '3', '4', '5'] as const).map((v) => ({
        value: v,
        label:
          v === '5'
            ? t('chrome.competitors.threatOnly', { n: v })
            : t('chrome.competitors.threatAtLeast', { n: v }),
        icon: <ShieldAlert className="size-4 shrink-0" />,
      })),
    [t]
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
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div className="mb-6 shrink-0" data-tour="competitors-page-header">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('pages.competitors.title')}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t('pages.competitors.description')}
          </p>
        </div>

        <div className="mb-4 flex w-full min-w-0 items-center justify-between gap-3" data-tour="competitors-toolbar">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <SearchableOptionListPicker
                selectedValue={statusFilter}
                onValueChange={(v) => setStatusFilter(v as CompetitorStatusFilterValue)}
                options={statusPickerOptions}
                placeholderLabelWhenAll={t('actions.allStatuses')}
                searchPlaceholder={t('chrome.competitors.searchStatuses')}
                emptyMessage={t('actions.noStatusFound')}
                triggerIcon={<ListFilter className="size-4 shrink-0" />}
                compactTriggerOnMobile
                triggerClassName="h-9 min-w-0 shrink-0 md:w-[170px]"
              />
              {statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex [&_svg]:pointer-events-auto"
                  aria-label={t('actions.clearStatusFilter')}
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
                placeholderLabelWhenAll={t('approvals.allTypes')}
                searchPlaceholder={t('chrome.competitors.searchTypes')}
                emptyMessage={t('chrome.competitors.noTypeFound')}
                triggerIcon={<Link2 className="size-4 shrink-0" />}
                compactTriggerOnMobile
                triggerClassName="h-9 min-w-0 shrink-0 md:w-[150px]"
              />
              {directFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setDirectFilter('all')}
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex [&_svg]:pointer-events-auto"
                  aria-label={t('chrome.lists.clearTypeFilter')}
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
                placeholderLabelWhenAll={t('chrome.competitors.anyThreatLevel')}
                searchPlaceholder={t('chrome.competitors.searchThreatLevels')}
                emptyMessage={t('chrome.competitors.noOptionFound')}
                triggerIcon={<ShieldAlert className="size-4 shrink-0" />}
                compactTriggerOnMobile
                triggerClassName="h-9 min-w-0 shrink-0 md:w-[160px]"
              />
              {threatFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setThreatFilter('all')}
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex [&_svg]:pointer-events-auto"
                  aria-label={t('chrome.lists.clearThreatFilter')}
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
          </div>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Input
              placeholder={t('chrome.competitors.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(filterToolbarSearchInputClassName, 'w-56 max-w-[16rem]')}
              aria-label={t('chrome.competitors.searchAria')}
            />
            {canEdit ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0 border-border bg-background text-foreground hover:bg-accent"
                      onClick={() => setImportModalOpen(true)}
                      aria-label={t('chrome.competitors.import')}
                    >
                      <Upload className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('chrome.competitors.import')}</TooltipContent>
                </Tooltip>
                <Button
                  className="h-9 shrink-0 gap-2 bg-violet-600 text-white hover:bg-violet-700 [&_svg]:text-white focus-visible:ring-violet-500/40"
                  onClick={openCreate}
                  data-tour="competitors-add"
                >
                  <Plus className="size-4" />
                  {t('chrome.competitors.add')}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" {...(isLoading ? {} : { 'data-tour': 'competitors-grid' })}>
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
            <p className="py-8 text-center text-muted-foreground">{t('chrome.competitors.noMatch')}</p>
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
                {isFetchingNext ? t('actions.loading') : t('actions.loadMore')}
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