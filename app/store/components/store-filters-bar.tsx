'use client';

import * as React from 'react';
import { Filter, LayoutGrid } from 'lucide-react';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 w-full border-border bg-background text-foreground sm:w-auto';

export interface StoreFilterControlsProps {
  layout: 'row' | 'stack';
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  categoryOptions: SearchableOptionRow[];
}

export function StoreFilterControls({
  layout,
  categoryFilter,
  onCategoryChange,
  categoryOptions,
}: StoreFilterControlsProps) {
  const row = layout === 'row';
  const categoryTrigger = row
    ? 'h-9 min-w-0 w-[170px] shrink-0'
    : 'h-9 w-full min-w-0';

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={categoryFilter}
          onValueChange={onCategoryChange}
          options={categoryOptions}
          allOptionValue="all"
          placeholderLabelWhenAll="All categories"
          searchPlaceholder="Search categories…"
          emptyMessage="No category found."
          triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
          triggerClassName={categoryTrigger}
        />
        {categoryFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => onCategoryChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label="Clear category filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function StoreFiltersBar({
  searchInput,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categoryOptions,
  cartSlot,
}: {
  searchInput: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  categoryOptions: SearchableOptionRow[];
  cartSlot?: React.ReactNode;
}) {
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

  function resetAll() {
    onSearchChange('');
    onCategoryChange('all');
  }

  function renderSearchField() {
    return (
      <div className="relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]">
        <Input
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(filterToolbarSearchInputClassName, searchInput && 'pr-8')}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const filterProps: StoreFilterControlsProps = {
    layout: 'row',
    categoryFilter,
    onCategoryChange,
    categoryOptions,
  };

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="store-toolbar">
      <div className="flex flex-col gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(
            selectTriggerClass,
            'h-9 min-w-0 w-full justify-center'
          )}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">{renderSearchField()}</div>
          {cartSlot ? <div className="shrink-0">{cartSlot}</div> : null}
        </div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Narrow products by category.
            </DialogDescription>
          </DialogHeader>
          <StoreFilterControls {...filterProps} layout="stack" />
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full"
              onClick={() => {
                resetAll();
                setFiltersDialogOpen(false);
              }}
            >
              Reset filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="hidden min-w-0 items-center justify-between gap-3 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <StoreFilterControls {...filterProps} layout="row" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={resetAll}
            >
              Reset filters
            </Button>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {renderSearchField()}
          {cartSlot}
        </div>
      </div>
    </div>
  );
}
