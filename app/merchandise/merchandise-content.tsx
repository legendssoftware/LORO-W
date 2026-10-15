'use client';

import { useEffect, useState } from 'react';
import { BadgeInfo, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { useJournals } from '@/api/hooks/use-journals';
import { canAccessMerchandise } from '@/lib/access';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import { MERCHANDISE_STATUS_OPTIONS } from '@/app/merchandise/lib/merchandise-display';
import { MerchandiseCreateDialog } from './components/merchandise-create-dialog';
import { MerchandiseGroupedList } from './components/merchandise-grouped-list';

const ABOUT_FEATURES = [
  'Track inventory levels and stock movements',
  'Monitor product locations and availability',
  'Record merchandise transactions and sales',
  'Manage product categories and classifications',
  'Generate inventory reports and analytics',
  'Set alerts for low stock and reorder points',
];

const primaryClass =
  'h-9 shrink-0 gap-2 border-0 bg-violet-600 px-4 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500 [&_svg]:text-white';

export function MerchandiseContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const [createOpen, setCreateOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const canCreate = canAccessMerchandise(backendUserData?.accessLevel);
  const listQuery = useJournals({
    enabled: isTokenReady && !isSyncing,
    status: statusFilter,
    search: debouncedSearch,
  });

  if (!isTokenReady || isSyncing) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  const err = listQuery.error;
  const statusCode = err ? getErrorStatus(err) : undefined;
  const errMsg = err ? getQueryErrorMessage(err, 'Could not load merchandise') : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Merchandise Management
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track and manage merchandise inventories and transactions
            </p>
          </div>
          <div className="flex gap-2">
            {canCreate ? (
              <Button className={primaryClass} onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New merchandise
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              aria-label="About merchandise"
              onClick={() => setAboutOpen(true)}
            >
              <BadgeInfo className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mb-6 flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="h-9 w-full border-border bg-background sm:w-auto"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {MERCHANDISE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search client, comments, or owner"
            className={cn(
              filterToolbarSearchInputClassName,
              'w-full md:ml-auto md:w-56 md:max-w-[16rem]'
            )}
            aria-label="Search merchandise"
          />
        </div>

        {statusCode === 403 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errMsg}
          </p>
        ) : err ? (
          <p className="text-center text-sm text-destructive">{errMsg}</p>
        ) : listQuery.isLoading ? (
          <LoadingSpinner wrapperClassName="py-12" />
        ) : (
          <MerchandiseGroupedList journals={listQuery.rows} />
        )}

        {listQuery.hasNextPage ? (
          <div className="flex justify-center py-6">
            <Button
              variant="outline"
              size="sm"
              disabled={listQuery.isFetchingNextPage}
              onClick={() => listQuery.fetchNextPage()}
            >
              {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </main>

      <MerchandiseCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About merchandise management</DialogTitle>
            <DialogDescription>
              Track and manage merchandise inventories, stock levels, and transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Merchandise management helps you track inventory levels, manage stock movements,
              monitor product transactions, and maintain detailed records of all merchandise
              activities.
            </p>
            <p className="font-medium text-foreground">Key features</p>
            <ul className="list-disc space-y-1 pl-5">
              {ABOUT_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
