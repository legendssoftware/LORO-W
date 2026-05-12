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
const SEARCH_DEBOUNCE_MS = 350;

export function ClientsContent() {
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
      <main className="container mx-auto flex min-h-0 max-w-6xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8 lg:max-w-[88rem]">
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="clients-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Clients</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Create, search, and manage organisation clients.
            </p>
          </div>
          <Button
            className="h-9 gap-2 shrink-0 self-start bg-violet-600 text-white hover:bg-violet-700 [&_svg]:text-white focus-visible:ring-violet-500/40"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Add client
          </Button>
        </div>

        <ClientsFiltersBar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
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
            <p className="text-center text-muted-foreground py-8">No clients match your filters.</p>
          )}
          {clientsQuery.hasNextPage ? (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-200"
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
