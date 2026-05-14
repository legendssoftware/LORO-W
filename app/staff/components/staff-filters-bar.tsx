'use client';

import * as React from 'react';
import {
  Briefcase,
  Building2,
  Check,
  ChevronsUpDown,
  Filter,
  LayoutGrid,
  MapPinned,
  Users,
} from 'lucide-react';
import {
  SearchableOptionListPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
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
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
    ? 'h-9 min-w-0 w-[140px] shrink-0'
    : 'h-9 w-full min-w-0';
  const roleTrigger = row
    ? 'h-9 min-w-0 w-[140px] shrink-0'
    : 'h-9 w-full min-w-0';
  const workforceTrigger = row
    ? 'h-9 min-w-0 w-[160px] shrink-0'
    : 'h-9 w-full min-w-0';
  const branchBtn = row
    ? 'h-9 min-w-0 w-[160px] shrink-0'
    : 'h-9 min-w-0 w-full';

  const statusPickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      STAFF_STATUS_FILTER_OPTIONS.filter((o) => o.value !== 'all').map((opt) => {
        const Icon = opt.icon;
        return {
          value: opt.value,
          label: opt.label,
          icon: <Icon className="size-4 shrink-0" size={16} />,
        };
      }),
    []
  );

  const rolePickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      roleFilterItems
        .filter((i) => i.value !== STAFF_DIMENSION_FILTER_ALL)
        .map((opt) => ({
          value: opt.value,
          label: opt.label,
          icon: <Briefcase className="size-4 shrink-0" />,
        })),
    [roleFilterItems]
  );

  const workforcePickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      workforceFilterItems
        .filter((i) => i.value !== STAFF_DIMENSION_FILTER_ALL)
        .map((opt) => ({
          value: opt.value,
          label: opt.label,
          icon: <Users className="size-4 shrink-0" />,
        })),
    [workforceFilterItems]
  );

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
          options={statusPickerOptions}
          placeholderLabelWhenAll="All"
          searchPlaceholder="Search status…"
          emptyMessage="No status found."
          triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
          triggerClassName={statusTrigger}
        />
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
        <SearchableOptionListPicker
          selectedValue={roleFilter}
          onValueChange={onRoleFilterChange}
          options={rolePickerOptions}
          allOptionValue={STAFF_DIMENSION_FILTER_ALL}
          placeholderLabelWhenAll="All roles"
          searchPlaceholder="Search roles…"
          emptyMessage="No role found."
          triggerIcon={<Briefcase className="size-4 shrink-0" />}
          triggerClassName={roleTrigger}
        />
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
        <SearchableOptionListPicker
          selectedValue={workforceFilter}
          onValueChange={onWorkforceFilterChange}
          options={workforcePickerOptions}
          allOptionValue={STAFF_DIMENSION_FILTER_ALL}
          placeholderLabelWhenAll="All workforce types"
          searchPlaceholder="Search workforce types…"
          emptyMessage="No type found."
          triggerIcon={<Users className="size-4 shrink-0" />}
          triggerClassName={workforceTrigger}
        />
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
              className={cn(
                reportsFilterSelectTriggerClass,
                'justify-between font-normal',
                branchBtn
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{branchFilterTriggerLabel}</span>
              </span>
              <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[min(100vw-2rem,24rem)] p-0',
              reportsFilterPortalHighZ
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
}

export function StaffFiltersBar({
  search,
  onSearchChange,
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
          className={cn(filterToolbarSearchInputClassName, search && 'pr-8')}
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

  return (
    <div className="flex flex-col gap-3 shrink-0 mb-4" data-tour="staff-toolbar">
      <div className="flex md:hidden flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full justify-center min-w-0')}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          Filter
        </Button>
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

      <div className="hidden md:flex w-full min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <StaffFilterControls {...filterProps} layout="row" />
            {renderSearchField()}
          </div>
        </div>
      </div>
    </div>
  );
}
