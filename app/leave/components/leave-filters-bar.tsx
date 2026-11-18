'use client';

import * as React from 'react';
import { Calendar, Filter, LayoutGrid } from 'lucide-react';
import type { BranchListItem } from '@/api/types/branch';
import { LEAVE_STATUS_OPTIONS } from '@/api/types/leave';
import {
  SearchableOptionListPicker,
  SearchableUserPicker,
  type ReportsFilterUserPickable,
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

const selectTriggerClass = 'h-9 w-full border-border bg-background text-foreground sm:w-auto';

export interface LeaveFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: string;
  onStatusChange: (value: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  showPersonFilter: boolean;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  userSearchQuery?: string;
  onUserSearchQueryChange?: (query: string) => void;
  isUserSearchLoading?: boolean;
}

export function LeaveFilterControls({
  layout,
  statusFilter,
  onStatusChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showPersonFilter,
  userFilter,
  onUserFilterChange,
  users,
  branches,
  userSearchQuery,
  onUserSearchQueryChange,
  isUserSearchLoading = false,
}: LeaveFilterControlsProps) {
  const row = layout === 'row';
  const statusTrigger = row ? 'h-9 min-w-0 w-[180px] shrink-0' : 'h-9 w-full min-w-0';
  const userTrigger = row
    ? 'h-9 min-w-[140px] w-[200px] shrink-0 sm:min-w-[220px] sm:w-[220px]'
    : 'h-9 w-full min-w-0';
  const dateClass = row ? 'h-9 w-[150px] shrink-0' : 'h-9 w-full';

  const statusOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      LEAVE_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        icon: <LayoutGrid className="size-4 shrink-0" />,
      })),
    []
  );

  const wrapClass = row ? 'flex flex-nowrap items-center gap-2' : 'flex w-full flex-col gap-4';

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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear status filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      {showPersonFilter ? (
        <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
          <SearchableUserPicker
            users={users}
            branches={branches}
            selectedUid={userFilter}
            onUidChange={onUserFilterChange}
            triggerClassName={userTrigger}
            allOptionLabel="All people"
            searchPlaceholder="Search people…"
            emptyMessage="No person found."
            searchQuery={userSearchQuery}
            onSearchQueryChange={onUserSearchQueryChange}
            isSearchLoading={isUserSearchLoading}
          />
        </div>
      ) : null}

      <div className={cn('flex min-w-0 items-center gap-2', !row && 'w-full flex-col items-stretch')}>
        <label className={cn('flex items-center gap-2 text-sm text-muted-foreground', !row && 'w-full')}>
          <Calendar className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">From date</span>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            aria-label="From date"
            className={dateClass}
          />
        </label>
        <label className={cn('flex items-center gap-2 text-sm text-muted-foreground', !row && 'w-full')}>
          <span className="sr-only">To date</span>
          <Input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            aria-label="To date"
            className={dateClass}
          />
        </label>
        {startDate || endDate ? (
          <button
            type="button"
            onClick={() => {
              onStartDateChange('');
              onEndDateChange('');
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear dates"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function LeaveFiltersBar({
  searchInput,
  onSearchChange,
  ...controls
}: LeaveFilterControlsProps & {
  searchInput: string;
  onSearchChange: (value: string) => void;
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
          placeholder="Search person, type, or reason…"
          className={cn(filterToolbarSearchInputClassName, searchInput && 'pr-8')}
          aria-label="Search leave requests"
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
        <div className="flex w-full min-w-0 items-center gap-2">{renderSearchField()}</div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Narrow leave by person, status, and dates.</DialogDescription>
          </DialogHeader>
          <LeaveFilterControls {...controls} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden w-full min-w-0 items-center justify-between gap-3 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <LeaveFilterControls {...controls} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">{renderSearchField()}</div>
      </div>
    </div>
  );
}
