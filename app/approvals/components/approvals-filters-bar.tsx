'use client';

import * as React from 'react';
import { Filter, LayoutGrid, Tags } from 'lucide-react';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
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
import {
  APPROVAL_STATUS_FILTERS,
  APPROVAL_TYPE_FILTERS,
} from '@/api/types/approvals';

const selectTriggerClass =
  'h-9 w-full border-border bg-background text-foreground sm:w-auto';

export interface ApprovalsFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}

export function ApprovalsFilterControls({
  layout,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: ApprovalsFilterControlsProps) {
  const row = layout === 'row';
  const statusTrigger = row
    ? 'h-9 min-w-0 w-[160px] shrink-0'
    : 'h-9 w-full min-w-0';
  const typeTrigger = row
    ? 'h-9 min-w-0 w-[180px] shrink-0'
    : 'h-9 w-full min-w-0';

  const statusOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      APPROVAL_STATUS_FILTERS.filter((option) => option.value !== 'all').map(
        (option) => ({
          value: option.value,
          label: option.label,
          icon: <LayoutGrid className="size-4 shrink-0" />,
        })
      ),
    []
  );

  const typeOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      APPROVAL_TYPE_FILTERS.filter((option) => option.value !== 'all').map(
        (option) => ({
          value: option.value,
          label: option.label,
          icon: <Tags className="size-4 shrink-0" />,
        })
      ),
    []
  );

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={statusFilter}
          onValueChange={onStatusChange}
          options={statusOptions}
          placeholderLabelWhenAll="All statuses"
          searchPlaceholder="Search status…"
          emptyMessage="No status found."
          triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
          triggerClassName={statusTrigger}
        />
        {statusFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => onStatusChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label="Clear status filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={typeFilter}
          onValueChange={onTypeChange}
          options={typeOptions}
          placeholderLabelWhenAll="All types"
          searchPlaceholder="Search types…"
          emptyMessage="No type found."
          triggerIcon={<Tags className="size-4 shrink-0" />}
          triggerClassName={typeTrigger}
        />
        {typeFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => onTypeChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label="Clear type filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ApprovalsFiltersBar({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: {
  searchInput: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
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

  function renderSearchField() {
    return (
      <div className="relative min-w-0 flex-1 md:w-56 md:max-w-[16rem] md:flex-none">
        <Input
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, reference, or hire…"
          className={cn(filterToolbarSearchInputClassName, searchInput && 'pr-8')}
          aria-label="Search approvals"
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

  const filterProps: ApprovalsFilterControlsProps = {
    layout: 'row',
    statusFilter,
    onStatusChange,
    typeFilter,
    onTypeChange,
  };

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3">
      <div className="flex flex-col gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full min-w-0 justify-center')}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {renderSearchField()}
        </div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Narrow approvals by status and type.
            </DialogDescription>
          </DialogHeader>
          <ApprovalsFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden w-full min-w-0 items-center justify-between gap-3 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <ApprovalsFilterControls {...filterProps} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {renderSearchField()}
        </div>
      </div>
    </div>
  );
}
