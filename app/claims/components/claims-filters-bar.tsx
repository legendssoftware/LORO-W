'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import {
  Ban,
  Banknote,
  CalendarIcon,
  CheckCircle2,
  CircleDot,
  Filter,
  FolderOpen,
  LayoutGrid,
  List,
  XCircle,
} from 'lucide-react';
import type { BranchListItem } from '@/api/types/branch';
import {
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type ReportsFilterUserPickable,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  localPickerDateFromUtcCalendarDate,
  localPickerRangeFromUtcCalendarRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  CLAIM_STATUS_FILTER_OPTIONS,
  type ClaimGroup,
} from '@/api/types/claims';
import type { ClaimsCurrencyView } from '@/app/claims/lib/claim-display';

const selectTriggerClass =
  'h-9 w-full border-border bg-background text-foreground sm:w-auto';

export function resetClaimsDateRangeToDefault(
  onCreatedFromChange: (v: string) => void,
  onCreatedToChange: (v: string) => void
) {
  onCreatedFromChange('');
  onCreatedToChange('');
}

function formatRangeButtonLabel(start: Date, end: Date): string {
  if (formatUtcYmd(start) === formatUtcYmd(end)) {
    return formatUtcCalendarLabel(start);
  }
  return `${formatUtcCalendarLabel(start)} – ${formatUtcCalendarLabel(end)}`;
}

function statusIconFor(value: string): React.ReactNode {
  const v = value.toLowerCase();
  if (v === 'pending') return <CircleDot className="size-4 shrink-0" />;
  if (v === 'approved') return <CheckCircle2 className="size-4 shrink-0" />;
  if (v === 'paid') return <Banknote className="size-4 shrink-0" />;
  if (v === 'cancelled') return <Ban className="size-4 shrink-0" />;
  if (v === 'declined' || v === 'rejected')
    return <XCircle className="size-4 shrink-0" />;
  return <CircleDot className="size-4 shrink-0" />;
}

export interface ClaimsFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: string;
  onStatusChange: (v: string) => void;
  claimGroupUid: string;
  onClaimGroupChange: (v: string) => void;
  groups: ClaimGroup[];
  createdFrom: string;
  createdTo: string;
  onCreatedFromChange: (v: string) => void;
  onCreatedToChange: (v: string) => void;
  currencyView: ClaimsCurrencyView;
  onCurrencyViewChange: (v: ClaimsCurrencyView) => void;
  showUserFilter: boolean;
  userFilter: string;
  onUserFilterChange: (v: string) => void;
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  userSearchQuery?: string;
  onUserSearchQueryChange?: (query: string) => void;
  isUserSearchLoading?: boolean;
}

export function ClaimsFilterControls({
  layout,
  statusFilter,
  onStatusChange,
  claimGroupUid,
  onClaimGroupChange,
  groups,
  createdFrom,
  createdTo,
  onCreatedFromChange,
  onCreatedToChange,
  currencyView,
  onCurrencyViewChange,
  showUserFilter,
  userFilter,
  onUserFilterChange,
  users,
  branches,
  userSearchQuery,
  onUserSearchQueryChange,
  isUserSearchLoading = false,
}: ClaimsFilterControlsProps) {
  const row = layout === 'row';
  const statusTrigger = row
    ? 'h-9 min-w-0 w-[150px] shrink-0'
    : 'h-9 w-full min-w-0';
  const folderTrigger = row
    ? 'h-9 min-w-0 w-[170px] shrink-0'
    : 'h-9 w-full min-w-0';
  const userTrigger = row
    ? 'h-9 min-w-[140px] w-[200px] shrink-0 sm:min-w-[220px] sm:w-[220px]'
    : 'h-9 w-full min-w-0';
  const rangeBtnWidth = row
    ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';

  const hasRange = Boolean(createdFrom?.trim() && createdTo?.trim());
  const rangeStart = hasRange
    ? utcDateFromYmd(createdFrom.trim())
    : utcToday();
  const rangeEnd = hasRange ? utcDateFromYmd(createdTo.trim()) : utcToday();

  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>();
  const skipFinalizeRef = React.useRef(false);

  const finalizeDraftToParent = React.useCallback(() => {
    if (!draft?.from) {
      onCreatedFromChange('');
      onCreatedToChange('');
      return;
    }
    const to = draft.to ?? draft.from;
    const ordered = orderUtcCalendarRange(draft.from, to);
    onCreatedFromChange(formatUtcYmd(ordered.start));
    onCreatedToChange(formatUtcYmd(ordered.end));
  }, [draft, onCreatedFromChange, onCreatedToChange]);

  function closeRangeWithoutFinalize() {
    skipFinalizeRef.current = true;
    setRangeOpen(false);
  }

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      skipFinalizeRef.current = false;
      setDraft(
        hasRange ? { from: rangeStart, to: rangeEnd } : undefined
      );
      setRangeOpen(true);
      return;
    }
    if (skipFinalizeRef.current) {
      skipFinalizeRef.current = false;
      setRangeOpen(false);
      return;
    }
    finalizeDraftToParent();
    setRangeOpen(false);
  }

  function handleShortcutToday() {
    const t = utcToday();
    onCreatedFromChange(formatUtcYmd(t));
    onCreatedToChange(formatUtcYmd(t));
    closeRangeWithoutFinalize();
  }

  function handleShortcutThisMonth() {
    const { start, end } = utcMonthStartThroughToday();
    onCreatedFromChange(formatUtcYmd(start));
    onCreatedToChange(formatUtcYmd(end));
    closeRangeWithoutFinalize();
  }

  function handleShortcutWholeMonth() {
    const { from, to } = getUtcMonthRange(utcToday());
    onCreatedFromChange(from);
    onCreatedToChange(to);
    closeRangeWithoutFinalize();
  }

  function handleShortcutAllDates() {
    resetClaimsDateRangeToDefault(onCreatedFromChange, onCreatedToChange);
    closeRangeWithoutFinalize();
  }

  const statusPickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      CLAIM_STATUS_FILTER_OPTIONS.filter((o) => o.value !== 'all').map(
        (opt) => ({
          value: opt.value,
          label: opt.label,
          icon: statusIconFor(opt.value),
        })
      ),
    []
  );

  const folderPickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      groups.map((g) => ({
        value: String(g.uid),
        label: g.title,
        icon: <FolderOpen className="size-4 shrink-0" />,
        searchExtra: `${g.title} ${g.uid}`,
      })),
    [groups]
  );

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-0', !row && 'w-full min-w-0')}>
        <Popover open={rangeOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(rangeBtnWidth, reportsFilterSelectTriggerClass)}
            >
              <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              {hasRange
                ? formatRangeButtonLabel(rangeStart, rangeEnd)
                : 'All dates'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[95vw] max-w-lg p-0 sm:w-auto',
              reportsFilterPortalHighZ
            )}
            align="center"
          >
            <Calendar
              mode="range"
              selected={localPickerRangeFromUtcCalendarRange(draft)}
              defaultMonth={localPickerDateFromUtcCalendarDate(
                draft?.from ?? (hasRange ? rangeStart : utcToday())
              )}
              onSelect={(r) => {
                if (!r) {
                  setDraft(undefined);
                  return;
                }
                setDraft({
                  from: r.from
                    ? utcCalendarDateFromLocalPickerDate(r.from)
                    : undefined,
                  to: r.to ? utcCalendarDateFromLocalPickerDate(r.to) : undefined,
                });
              }}
              initialFocus
              numberOfMonths={2}
            />
            <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShortcutAllDates}
                >
                  All dates
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShortcutToday}
                >
                  Today (UTC)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShortcutThisMonth}
                >
                  This month (UTC)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShortcutWholeMonth}
                >
                  Whole month (UTC)
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                className={cn(
                  'bg-violet-600 text-white shadow-sm border-transparent',
                  'hover:bg-violet-700 hover:text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2'
                )}
                onClick={() => handlePopoverOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {hasRange ? (
          <button
            type="button"
            onClick={() =>
              resetClaimsDateRangeToDefault(onCreatedFromChange, onCreatedToChange)
            }
            className="ml-0.5 shrink-0 rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Reset date range"
          >
            <XIcon className="size-4 text-red-600" />
          </button>
        ) : null}
      </div>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={statusFilter}
          onValueChange={onStatusChange}
          options={statusPickerOptions}
          allOptionValue="all"
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

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={claimGroupUid}
          onValueChange={onClaimGroupChange}
          options={folderPickerOptions}
          allOptionValue="all"
          placeholderLabelWhenAll="All folders"
          searchPlaceholder="Search folders…"
          emptyMessage="No folder found."
          triggerIcon={<FolderOpen className="size-4 shrink-0" />}
          triggerClassName={folderTrigger}
        />
        {claimGroupUid !== 'all' ? (
          <button
            type="button"
            onClick={() => onClaimGroupChange('all')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
            aria-label="Clear folder filter"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      {showUserFilter ? (
        <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
          <SearchableUserPicker
            users={users}
            branches={branches}
            selectedUid={userFilter === '' ? 'all' : userFilter}
            onUidChange={onUserFilterChange}
            triggerClassName={userTrigger}
            allOptionLabel="All users"
            searchPlaceholder="Search users…"
            emptyMessage="No user found."
            searchQuery={userSearchQuery}
            onSearchQueryChange={onUserSearchQueryChange}
            isSearchLoading={isUserSearchLoading}
          />
          {userFilter !== 'all' && userFilter !== '' ? (
            <button
              type="button"
              onClick={() => onUserFilterChange('all')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
              aria-label="Clear user filter"
            >
              <XIcon className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>
      ) : null}

      <ToggleGroup
        type="single"
        value={currencyView}
        onValueChange={(value) => {
          if (value === 'original' || value === 'zar') {
            onCurrencyViewChange(value);
          }
        }}
        variant="outline"
        size="sm"
        className={cn(row ? 'shrink-0' : 'w-full')}
        aria-label="Amount currency"
      >
        <ToggleGroupItem value="original" className="px-3">
          Original
        </ToggleGroupItem>
        <ToggleGroupItem value="zar" className="px-3">
          ZAR
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export type ClaimsPageViewMode = 'grid' | 'list';

export function ClaimsFiltersBar({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  createdFrom,
  createdTo,
  onCreatedFromChange,
  onCreatedToChange,
  groups,
  claimGroupUid,
  onClaimGroupChange,
  currencyView,
  onCurrencyViewChange,
  showUserFilter,
  userFilter,
  onUserFilterChange,
  users,
  branches,
  userSearchQuery,
  onUserSearchQueryChange,
  isUserSearchLoading,
  viewMode,
  onViewModeChange,
}: {
  searchInput: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  createdFrom: string;
  createdTo: string;
  onCreatedFromChange: (v: string) => void;
  onCreatedToChange: (v: string) => void;
  groups: ClaimGroup[];
  claimGroupUid: string;
  onClaimGroupChange: (v: string) => void;
  currencyView: ClaimsCurrencyView;
  onCurrencyViewChange: (v: ClaimsCurrencyView) => void;
  showUserFilter: boolean;
  userFilter: string;
  onUserFilterChange: (v: string) => void;
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  userSearchQuery?: string;
  onUserSearchQueryChange?: (query: string) => void;
  isUserSearchLoading?: boolean;
  viewMode: ClaimsPageViewMode;
  onViewModeChange: (mode: ClaimsPageViewMode) => void;
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
    onStatusChange('all');
    resetClaimsDateRangeToDefault(onCreatedFromChange, onCreatedToChange);
    onClaimGroupChange('all');
    onUserFilterChange('all');
  }

  function renderViewToggle() {
    return (
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => {
          if (value === 'grid' || value === 'list') onViewModeChange(value);
        }}
        variant="outline"
        size="sm"
        className="shrink-0"
        aria-label="Claims layout"
      >
        <ToggleGroupItem value="grid" aria-label="Folder grid" className="px-2.5">
          <LayoutGrid className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="User list" className="px-2.5">
          <List className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    );
  }

  function renderSearchField() {
    return (
      <div className="relative min-w-0 flex-1 md:w-56 md:max-w-[16rem] md:flex-none">
        <Input
          placeholder="Ref, category, owner…"
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

  const filterProps: ClaimsFilterControlsProps = {
    layout: 'row',
    statusFilter,
    onStatusChange,
    claimGroupUid,
    onClaimGroupChange,
    groups,
    createdFrom,
    createdTo,
    onCreatedFromChange,
    onCreatedToChange,
    currencyView,
    onCurrencyViewChange,
    showUserFilter,
    userFilter,
    onUserFilterChange,
    users,
    branches,
    userSearchQuery,
    onUserSearchQueryChange,
    isUserSearchLoading,
  };

  return (
    <div
      className="mb-4 flex shrink-0 flex-col gap-3"
      data-tour="claims-toolbar"
    >
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(selectTriggerClass, 'h-9 min-w-0 flex-1 justify-center')}
            onClick={() => setFiltersDialogOpen(true)}
          >
            <Filter className="mr-2 size-4 shrink-0" aria-hidden />
            Filter
          </Button>
          {renderViewToggle()}
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {renderSearchField()}
        </div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Narrow claims by status, created date, folder, and user.
            </DialogDescription>
          </DialogHeader>
          <ClaimsFilterControls {...filterProps} layout="stack" />
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
            <ClaimsFilterControls {...filterProps} layout="row" />
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
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {renderViewToggle()}
          {renderSearchField()}
        </div>
      </div>
    </div>
  );
}
