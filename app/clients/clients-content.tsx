'use client';

import { useEffect, useState } from 'react';
import { useTokenReady, useClientsInfinite } from '@/api/hooks';
import type { ClientListItem } from '@/api/types/clients';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import type { ClientCategoryFilterValue, ClientStatusFilterValue } from '@/lib/client-filter-utils';
import { ClientCard, ClientCardSkeleton } from './components/client-card';
import { ClientDetailDialog } from './components/client-detail-dialog';
import { ClientFormDialog } from './components/client-form-dialog';
import { ClientsFiltersBar } from './components/clients-filters-bar';
import { Plus } from 'lucide-react';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const SEARCH_DEBOUNCE_MS = 350;

export function ClientsContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const [statusFilter, setStatusFilter] = useState<ClientStatusFilterValue>('all');
  const [categoryFilter, setCategoryFilter] = useState<ClientCategoryFilterValue>('all');

  const [detailClient, setDetailClient] = useState<ClientListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formClientRef, setFormClientRef] = useState<number | null>(null);

  const statusParam =
    statusFilter === 'all' ? undefined : statusFilter;
  const categoryParam =
    categoryFilter === 'all' ? undefined : categoryFilter;

  const clientsQuery = useClientsInfinite(
    {
      search: debouncedSearch || undefined,
      status: statusParam,
      category: categoryParam,
      enabled: isTokenReady,
    }
  );

  const clientRows = clientsQuery.data ?? [];
  const isLoading = clientsQuery.isLoading;
  const isFetchingNext = clientsQuery.isFetchingNextPage;

  if (!isTokenReady) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  function openCreate() {
    setFormMode('create');
    setFormClientRef(null);
    setFormOpen(true);
  }

  function openEdit(ref: number) {
    setDetailClient(null);
    setFormMode('edit');
    setFormClientRef(ref);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div className="mb-6 shrink-0" data-tour="clients-page-header">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('pages.clients.title')}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {t('pages.clients.description')}
          </p>
        </div>

        <ClientsFiltersBar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          actions={
            <Button
              className="h-9 shrink-0 gap-2 bg-violet-600 text-white hover:bg-violet-700 [&_svg]:text-white focus-visible:ring-violet-500/40"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              {t('chrome.clients.add')}
            </Button>
          }
        />

        <div className="flex-1 min-h-0 overflow-y-auto" data-tour="clients-grid">
          {isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {clientRows.map((client) => (
                <ClientCard
                  key={client.uid}
                  client={client}
                  onClick={() => setDetailClient(client)}
                />
              ))}
            </div>
          )}
          {!isLoading && clientRows.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t('chrome.clients.noMatch')}</p>
          )}
          {clientsQuery.hasNextPage ? (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="sm"
                className="bg-background border-border"
                disabled={isFetchingNext}
                onClick={() => clientsQuery.fetchNextPage()}
              >
                {isFetchingNext ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      <ClientDetailDialog
        listItem={detailClient}
        onClose={() => setDetailClient(null)}
        onEdit={(ref) => openEdit(ref)}
      />

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        clientRef={formClientRef}
      />
    </div>
  );
}
