'use client';

import * as React from 'react';
import {
  Briefcase,
  Check,
  ChevronsUpDown,
  Filter,
  List,
  MapPinned,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { XIcon } from '@/lib/icons';
import {
  STAFF_STATUS_FILTER_OPTIONS,
  STAFF_DIMENSION_FILTER_ALL,
} from '@/lib/staff-filter-utils';
import { cn } from '@/lib/utils';
import type { StatusFilter } from '@/app/reports/types';

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

export interface StaffDimensionFilterItem {
  value: string;
  label: string;
}

export interface StaffFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  roleFilterItems: StaffDimensionFilterItem[];
  workforceFilter: string;
  onWorkforceFilterChange: (v: string) => void;
  workforceFilterItems: StaffDimensionFilterItem[];
  branchFilter: string;
  onBranchFilterChange: (v: string) => void;
  branchFilterItems: StaffDimensionFilterItem[];
  branchFilterTriggerLabel: string;
  branchPickerOpen: boolean;
  onBranchPickerOpenChange: (open: boolean) => void;
}

export function StaffFilterControls({
  layout,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  roleFilterItems,
  workforceFilter,
  onWorkforceFilterChange,
  workforceFilterItems,
  branchFilter,
  onBranchFilterChange,
  branchFilterItems,
  branchFilterTriggerLabel,
  branchPickerOpen,
  onBranchPickerOpenChange,
}: StaffFilterControlsProps) {
  const row = layout === 'row';
  const statusTrigger = row
    ? 'h-9 min-w-0 w-[140px] shrink-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0'
    : 'h-9 min-w-0 w-full bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0';
  const roleTrigger = row
    ? 'h-9 min-w-0 w-[140px] shrink-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0'
    : 'h-9 min-w-0 w-full bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0';
  const workforceTrigger = row
    ? 'h-9 min-w-0 w-[160px] shrink-0 bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0'
    : 'h-9 min-w-0 w-full bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0';
  const branchBtn = row
    ? 'h-9 min-w-0 w-[160px] shrink-0 justify-between bg-white border-gray-200 text-foreground font-normal [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0'
    : 'h-9 min-w-0 w-full justify-between bg-white border-gray-200 text-foreground font-normal [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0';

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const portalHighZ = 'z-[10001]';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
        >
          <SelectTrigger className={statusTrigger}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className={portalHighZ}>
            {STAFF_STATUS_FILTER_OPTIONS.map((opt) => (
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
            className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label="Clear status filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className={roleTrigger}>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className={portalHighZ}>
            {roleFilterItems.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <Briefcase className="size-4 shrink-0" />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onRoleFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label="Clear role filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Select value={workforceFilter} onValueChange={onWorkforceFilterChange}>
          <SelectTrigger className={workforceTrigger}>
            <SelectValue placeholder="Workforce type" />
          </SelectTrigger>
          <SelectContent className={portalHighZ}>
            {workforceFilterItems.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <Users className="size-4 shrink-0" />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {workforceFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onWorkforceFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label="Clear workforce type filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Popover open={branchPickerOpen} onOpenChange={onBranchPickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={branchPickerOpen}
              className={branchBtn}
            >
              <span className="truncate">{branchFilterTriggerLabel}</span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[min(100vw-2rem,24rem)] p-0',
              portalHighZ
            )}
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search branches…" />
              <CommandList>
                <CommandEmpty>No branch found.</CommandEmpty>
                <CommandGroup>
                  {branchFilterItems.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`}
                      onSelect={() => {
                        onBranchFilterChange(opt.value);
                        onBranchPickerOpenChange(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          branchFilter === opt.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                        <MapPinned className="size-4 shrink-0" />
                        {opt.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {branchFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onBranchFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label="Clear branch filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface StaffFiltersBarProps
  extends Omit<StaffFilterControlsProps, 'layout'> {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSummary: () => void;
}

export function StaffFiltersBar({
  search,
  onSearchChange,
  onOpenSummary,
  ...filterProps
}: StaffFiltersBarProps) {
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
      <div className="relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]">
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
            search && 'pr-8'
          )}
        />
        {search ? (
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

  const summaryButtonDesktop = (
    <div className="flex shrink-0">
      <Button
        type="button"
        variant="outline"
        className={cn(selectTriggerClass, 'h-9 shrink-0 gap-2')}
        onClick={onOpenSummary}
      >
        <List className="size-4 shrink-0" aria-hidden />
        Summary
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 shrink-0 mb-4" data-tour="staff-toolbar">
      <div className="flex md:hidden flex-col gap-2">
        <div className="flex w-full min-w-0 flex-row items-stretch justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              selectTriggerClass,
              'h-9 flex-1 basis-0 justify-center min-w-0'
            )}
            onClick={() => setFiltersDialogOpen(true)}
          >
            <Filter className="mr-2 size-4 shrink-0" aria-hidden />
            Filter
          </Button>
          <div className="flex min-w-0 flex-1 basis-0">
            <Button
              type="button"
              variant="outline"
              className={cn(
                selectTriggerClass,
                'h-9 w-full justify-center min-w-0 gap-2'
              )}
              onClick={onOpenSummary}
            >
              <List className="mr-2 size-4 shrink-0" aria-hidden />
              Summary
            </Button>
          </div>
        </div>
        {renderSearchField()}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Narrow the staff list by status, role, workforce type, and branch.
            </DialogDescription>
          </DialogHeader>
          <StaffFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
        <div
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <StaffFilterControls {...filterProps} layout="row" />
            {renderSearchField()}
          </div>
        </div>
        {summaryButtonDesktop}
      </div>
    </div>
  );
}
