'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import {
  CalendarIcon,
  CopyMinus,
  Filter,
  LayoutGrid,
  Upload as UploadIcon,
} from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import {
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';
import { Button } from '@/components/ui/button';
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
import { Calendar } from '@/components/ui/calendar';
import { XIcon } from '@/lib/icons';
import {
  LEAD_STATUS_OPTIONS_WITH_ALL,
  LEAD_SOURCE_OPTIONS_WITH_ALL,
} from '@/lib/lead-form-utils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const selectTriggerClass =
  'h-9 bg-white border-gray-200 text-foreground sm:w-auto';

export interface LeadsFilterControlsProps {
  layout: 'row' | 'stack';
  listScope: 'me' | 'all';
  users: UserListItem[];
  branches: BranchListItem[];
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  selectedSource: string;
  selectedUserId: string;
  dateRangePopoverOpen: boolean;
  onDateRangePopoverOpenChange: (open: boolean) => void;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onSetUseAllTime: (v: boolean) => void;
  onResetDateRange: () => void;
  onSelectedStatusChange: (v: string) => void;
  onSelectedSourceChange: (v: string) => void;
  onSelectedUserIdChange: (v: string) => void;
}

export function LeadsFilterControls({
  layout,
  listScope,
  users,
  branches,
  startDate,
  endDate,
  useAllTime,
  selectedStatus,
  selectedSource,
  selectedUserId,
  dateRangePopoverOpen,
  onDateRangePopoverOpenChange,
  onRangeChange,
  onSetUseAllTime,
  onResetDateRange,
  onSelectedStatusChange,
  onSelectedSourceChange,
  onSelectedUserIdChange,
}: LeadsFilterControlsProps) {
  const row = layout === 'row';

  const statusVal = selectedStatus === '' ? 'all' : selectedStatus;
  const sourceVal = selectedSource === '' ? 'all' : selectedSource;

  const SourceAllIconOption = LEAD_SOURCE_OPTIONS_WITH_ALL[0]?.icon;

  const smallTrigger = row
    ? 'h-9 min-w-[100px] w-[128px] shrink-0'
    : 'h-9 w-full min-w-0';
  const ownerTrigger = row
    ? 'h-9 min-w-[140px] w-[200px] shrink-0 sm:min-w-[220px] sm:w-[220px]'
    : 'h-9 w-full min-w-0';

  const rangeBtnBase = row
    ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const [draft, setDraft] = React.useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });

  const skipApplyOnCloseRef = React.useRef(false);

  const mtd = utcMonthStartThroughToday();
  const isDefaultRange =
    !useAllTime &&
    formatUtcYmd(startDate) === formatUtcYmd(mtd.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(mtd.end);

  function handleDatePopoverOpenChange(open: boolean) {
    if (open) {
      skipApplyOnCloseRef.current = false;
      setDraft({ from: startDate, to: endDate });
      onDateRangePopoverOpenChange(true);
      return;
    }
    if (!skipApplyOnCloseRef.current && !useAllTime) {
      const from = draft?.from ?? startDate;
      const to = draft?.to ?? draft?.from ?? endDate;
      onRangeChange(orderUtcCalendarRange(from, to));
    }
    skipApplyOnCloseRef.current = false;
    onDateRangePopoverOpenChange(false);
  }

  const statusPickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      LEAD_STATUS_OPTIONS_WITH_ALL.filter((o) => o.value !== 'all').map((opt) => {
        const Icon = opt.icon;
        return {
          value: opt.value,
          label: opt.label,
          icon: <Icon className="size-4 shrink-0" size={16} />,
        };
      }),
    []
  );

  const sourcePickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      LEAD_SOURCE_OPTIONS_WITH_ALL.filter((o) => o.value !== 'all').map((opt) => {
        const Icon = opt.icon;
        return {
          value: opt.value,
          label: opt.label,
          icon: <Icon className="size-4 shrink-0" size={16} />,
        };
      }),
    []
  );

  const rangeLabel = useAllTime
    ? 'All time'
    : formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  const handleShortcutToday = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const t = utcToday();
    onSetUseAllTime(false);
    onRangeChange({ start: t, end: t });
    onDateRangePopoverOpenChange(false);
  }, [onSetUseAllTime, onRangeChange, onDateRangePopoverOpenChange]);

  const handleShortcutThisMonth = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    onSetUseAllTime(false);
    onRangeChange({ start, end });
    onDateRangePopoverOpenChange(false);
  }, [onSetUseAllTime, onRangeChange, onDateRangePopoverOpenChange]);

  const handleShortcutWholeMonth = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onSetUseAllTime(false);
    onRangeChange({
      start: utcDateFromYmd(from),
      end: utcDateFromYmd(to),
    });
    onDateRangePopoverOpenChange(false);
  }, [onSetUseAllTime, onRangeChange, onDateRangePopoverOpenChange]);

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-0', !row && 'w-full min-w-0')}>
        <Popover
          open={dateRangePopoverOpen}
          onOpenChange={handleDatePopoverOpenChange}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(reportsFilterSelectTriggerClass, rangeBtnBase)}
            >
              <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[95vw] max-w-lg p-0 sm:w-auto',
              reportsFilterPortalHighZ
            )}
            align="center"
          >
            <div className="flex flex-col gap-3 border-b p-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={useAllTime ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSetUseAllTime(true)}
                >
                  All time
                </Button>
                <span className="text-xs text-muted-foreground">
                  or pick a UTC range below
                </span>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={draft}
              disabled={useAllTime}
              onSelect={(r) => {
                if (useAllTime) return;
                if (!r) {
                  setDraft(undefined);
                  return;
                }
                onSetUseAllTime(false);
                setDraft({
                  from: r.from
                    ? utcCalendarDateFromLocalPickerDate(r.from)
                    : undefined,
                  to: r.to
                    ? utcCalendarDateFromLocalPickerDate(r.to)
                    : undefined,
                });
              }}
              initialFocus
              numberOfMonths={layout === 'stack' ? 1 : 2}
            />
            <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={useAllTime}
                  onClick={handleShortcutToday}
                >
                  Today (UTC)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={useAllTime}
                  onClick={handleShortcutThisMonth}
                >
                  This month (UTC)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={useAllTime}
                  onClick={handleShortcutWholeMonth}
                >
                  Whole month (UTC)
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={useAllTime}
                className={cn(
                  'bg-violet-600 text-white shadow-sm border-transparent',
                  'hover:bg-violet-700 hover:text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                  useAllTime && 'pointer-events-none opacity-50'
                )}
                onClick={() => handleDatePopoverOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {useAllTime || !isDefaultRange ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onResetDateRange();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onResetDateRange();
              }
            }}
            className="ml-0.5 shrink-0 cursor-pointer rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Reset to default range"
          >
            <XIcon className="size-4 text-red-600" />
          </span>
        ) : null}
      </div>

      <SearchableOptionListPicker
        selectedValue={statusVal}
        onValueChange={onSelectedStatusChange}
        options={statusPickerOptions}
        placeholderLabelWhenAll="All statuses"
        searchPlaceholder="Search statuses…"
        emptyMessage="No status found."
        triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
        triggerClassName={smallTrigger}
      />

      <SearchableOptionListPicker
        selectedValue={sourceVal}
        onValueChange={onSelectedSourceChange}
        options={sourcePickerOptions}
        placeholderLabelWhenAll="All sources"
        searchPlaceholder="Search sources…"
        emptyMessage="No source found."
        triggerIcon={
          SourceAllIconOption ? (
            <SourceAllIconOption
              className="size-4 shrink-0"
              size={16}
            />
          ) : null
        }
        triggerClassName={smallTrigger}
      />

      {listScope === 'all' ? (
        <SearchableUserPicker
          users={users}
          branches={branches}
          selectedUid={selectedUserId === '' ? 'all' : selectedUserId}
          onUidChange={onSelectedUserIdChange}
          triggerClassName={ownerTrigger}
        />
      ) : null}
    </div>
  );
}

export interface LeadsFiltersBarProps extends Omit<LeadsFilterControlsProps, 'layout'> {
  searchInput: string;
  onSearchChange: (value: string) => void;
  canDedupe: boolean;
  dedupePending: boolean;
  onImportClick: () => void;
  onDedupeClick: () => void;
}

export function LeadsFiltersBar({
  searchInput,
  onSearchChange,
  canDedupe,
  dedupePending,
  onImportClick,
  onDedupeClick,
  ...filterProps
}: LeadsFiltersBarProps) {
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
          placeholder="Search leads…"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            filterToolbarSearchInputClassName,
            searchInput && 'pr-8'
          )}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <XIcon className="size-4 text-red-600" />
          </button>
        ) : null}
      </div>
    );
  }

  const actionButtons = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50 hover:text-neutral-950"
            onClick={onImportClick}
            aria-label="Import leads"
          >
            <UploadIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import leads</TooltipContent>
      </Tooltip>
      {canDedupe ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0 border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={onDedupeClick}
              disabled={dedupePending}
              aria-label="Dedupe leads"
            >
              <CopyMinus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Remove duplicate leads for this organisation (keeps the oldest in each group)
          </TooltipContent>
        </Tooltip>
      ) : null}
    </>
  );

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="leads-toolbar">
      <div className="flex md:hidden flex-col gap-2">
        <div className="flex w-full min-w-0 flex-row items-stretch gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              selectTriggerClass,
              'h-9 min-w-0 flex-1 justify-center gap-2'
            )}
            onClick={() => setFiltersDialogOpen(true)}
          >
            <Filter className="size-4 shrink-0" aria-hidden />
            Filter
          </Button>
          <div className="flex shrink-0 items-center gap-2">{actionButtons}</div>
        </div>
        {renderSearchField('w-full')}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Date range, status, source, and owner for the leads list.
            </DialogDescription>
          </DialogHeader>
          <LeadsFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <LeadsFilterControls {...filterProps} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {renderSearchField()}
          {actionButtons}
        </div>
      </div>
    </div>
  );
}
