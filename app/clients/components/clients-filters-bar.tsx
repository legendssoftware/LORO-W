'use client';

import * as React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 bg-white border-gray-200 text-foreground sm:w-auto';

const portalHighZ = 'z-[10001]';

export interface ClientsFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: ClientStatusFilterValue;
  onStatusFilterChange: (v: ClientStatusFilterValue) => void;
  categoryFilter: ClientCategoryFilterValue;
  onCategoryFilterChange: (v: ClientCategoryFilterValue) => void;
}

export function ClientsFilterControls({
  layout,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}: ClientsFilterControlsProps) {
  const row = layout === 'row';
  const statusTrigger = row
    ? 'h-9 min-w-0 w-[160px] shrink-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0'
    : 'h-9 w-full min-w-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0';
  const categoryTrigger = row
    ? 'h-9 min-w-0 w-[150px] shrink-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0'
    : 'h-9 w-full min-w-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0';
  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as ClientStatusFilterValue)}
        >
          <SelectTrigger className={statusTrigger}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className={portalHighZ}>
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
            onClick={() => onStatusFilterChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label="Clear status filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Select
          value={categoryFilter}
          onValueChange={(v) => onCategoryFilterChange(v as ClientCategoryFilterValue)}
        >
          <SelectTrigger className={categoryTrigger}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className={portalHighZ}>
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
            onClick={() => onCategoryFilterChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label="Clear category filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface ClientsFiltersBarProps
  extends Omit<ClientsFilterControlsProps, 'layout'> {
  searchInput: string;
  onSearchChange: (value: string) => void;
}

export function ClientsFiltersBar({
  searchInput,
  onSearchChange,
  ...filterProps
}: ClientsFiltersBarProps) {
  const [filtersDialogOpen, setFiltersDialogOpen] = React.useState(false);

  React.useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function renderSearchField(className?: string) {
    return (
      <div
        className={cn(
          'relative min-w-0 shrink-0 md:w-56 md:max-w-[16rem]',
          className
        )}
      >
        <Input
          placeholder="Search name, email, or phone"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'h-9 w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0',
            searchInput && 'pr-8'
          )}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="clients-toolbar">
      <div className="flex md:hidden flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full justify-center gap-2')}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        {renderSearchField('w-full')}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Filter clients by status and category.
            </DialogDescription>
          </DialogHeader>
          <ClientsFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <ClientsFilterControls {...filterProps} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {renderSearchField()}
        </div>
      </div>
    </div>
  );
}
