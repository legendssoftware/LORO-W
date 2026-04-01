'use client';

import { useEffect, useState } from 'react';
import { useTokenReady, useClientsInfinite } from '@/api/hooks';
import type { ClientListItem } from '@/api/types/clients';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { XIcon } from '@/lib/icons';
import {
  CLIENT_CATEGORY_PRESETS,
  CLIENT_STATUS_FILTER_OPTIONS,
  type ClientCategoryFilterValue,
  type ClientStatusFilterValue,
} from '@/lib/client-filter-utils';
import { ClientCard, ClientCardSkeleton } from './components/client-card';
import { ClientDetailDialog } from './components/client-detail-dialog';
import { ClientFormDialog } from './components/client-form-dialog';
import { cn } from '@/lib/utils';
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
      <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <div className="shrink-0 mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">
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

        <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center justify-between gap-3 shrink-0 mb-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ClientStatusFilterValue)}
              >
                <SelectTrigger className="h-9 min-w-0 w-full sm:min-w-[160px] sm:w-[160px] bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="size-4 shrink-0" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
                  aria-label="Clear status filter"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as ClientCategoryFilterValue)}
              >
                <SelectTrigger className="h-9 min-w-0 w-full sm:min-w-[150px] sm:w-[150px] bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_CATEGORY_PRESETS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
                  aria-label="Clear category filter"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="relative w-full min-w-0 lg:flex-initial lg:w-56 lg:max-w-[16rem]">
            <Input
              placeholder="Search name, email, or phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(
                'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
                searchInput && 'pr-8'
              )}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
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
