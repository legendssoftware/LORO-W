'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, Filter, LayoutGrid, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import type { BranchListItem } from '@/api/types/branch';
import type { TranscriptStatus } from '@/api/types/calls';
import {
  SearchableBranchPicker,
  SearchableOptionListPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { XIcon } from '@/lib/icons';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import { cn } from '@/lib/utils';
import { TRANSCRIPT_STATUS_FILTER_OPTIONS } from '../call-display';

const selectTriggerClass = 'h-9 w-full border-border bg-background text-foreground sm:w-auto';

export type CallsDirectionFilter = 'all' | 'inbound' | 'outbound';
export type CallsStatusFilter = 'all' | TranscriptStatus;

export interface CallsFiltersBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  statusFilter: CallsStatusFilter;
  onStatusFilterChange: (value: CallsStatusFilter) => void;
  directionFilter: CallsDirectionFilter;
  onDirectionFilterChange: (value: CallsDirectionFilter) => void;
  selectedBranchId: string;
  onBranchIdChange: (value: string) => void;
  branches: BranchListItem[];
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onUseAllTimeChange: (value: boolean) => void;
  onResetDateRange: () => void;
}

const DIRECTION_FILTER_OPTIONS: SearchableOptionRow[] = [
  {
    value: 'inbound',
    label: 'Inbound',
    icon: <PhoneIncoming className="size-4 shrink-0" />,
  },
  {
    value: 'outbound',
    label: 'Outbound',
    icon: <PhoneOutgoing className="size-4 shrink-0" />,
  },
];

function CallsDateRangePicker({
  layout,
  startDate,
  endDate,
  useAllTime,
  onRangeChange,
  onUseAllTimeChange,
  onResetDateRange,
}: {
  layout: 'row' | 'stack';
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onUseAllTimeChange: (value: boolean) => void;
  onResetDateRange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const skipApplyOnCloseRef = useRef(false);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        skipApplyOnCloseRef.current = false;
        setDraft({ from: startDate, to: endDate });
        setOpen(true);
        return;
      }
      if (!skipApplyOnCloseRef.current && !useAllTime) {
        const from = draft?.from ?? startDate;
        const to = draft?.to ?? draft?.from ?? endDate;
        const ordered = orderUtcCalendarRange(from, to);
        onRangeChange({ start: ordered.start, end: ordered.end });
        onUseAllTimeChange(false);
      }
      skipApplyOnCloseRef.current = false;
      setOpen(false);
    },
    [draft, useAllTime, startDate, endDate, onRangeChange, onUseAllTimeChange],
  );

  const mtd = utcMonthStartThroughToday();
  const isDefaultRange =
    !useAllTime &&
    formatUtcYmd(startDate) === formatUtcYmd(mtd.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(mtd.end);

  const rangeLabel = useAllTime
    ? 'All time'
    : formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  const shortcutToday = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const t = utcToday();
    onUseAllTimeChange(false);
    onRangeChange({ start: t, end: t });
    setOpen(false);
  }, [onUseAllTimeChange, onRangeChange]);

  const shortcutThisMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    onUseAllTimeChange(false);
    onRangeChange({ start, end });
    setOpen(false);
  }, [onUseAllTimeChange, onRangeChange]);

  const shortcutWholeMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onUseAllTimeChange(false);
    onRangeChange({ start: utcDateFromYmd(from), end: utcDateFromYmd(to) });
    setOpen(false);
  }, [onUseAllTimeChange, onRangeChange]);

  const triggerClass =
    layout === 'row'
      ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
      : 'h-9 w-full min-w-0 justify-start text-left font-normal';

  return (
    <div className={cn('flex items-center gap-0', layout === 'stack' && 'w-full')}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(reportsFilterSelectTriggerClass, triggerClass)}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
            {rangeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-[95vw] max-w-lg p-0 sm:w-auto', reportsFilterPortalHighZ)}
          align="center"
        >
          <div className="flex flex-col gap-3 border-b p-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={useAllTime ? 'default' : 'outline'}
                size="sm"
                onClick={() => onUseAllTimeChange(true)}
              >
                All time
              </Button>
              <span className="text-xs text-muted-foreground">or pick a UTC range below</span>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={draft}
            disabled={useAllTime}
            onSelect={(range) => {
              if (useAllTime) return;
              if (!range) {
                setDraft(undefined);
                return;
              }
              onUseAllTimeChange(false);
              setDraft({
                from: range.from ? utcCalendarDateFromLocalPickerDate(range.from) : undefined,
                to: range.to ? utcCalendarDateFromLocalPickerDate(range.to) : undefined,
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
                disabled={useAllTime}
                onClick={shortcutToday}
              >
                Today (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={useAllTime}
                onClick={shortcutThisMonth}
              >
                This month (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={useAllTime}
                onClick={shortcutWholeMonth}
              >
                Whole month (UTC)
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={useAllTime}
              className={cn(
                'border-transparent bg-violet-600 text-white shadow-sm',
                'hover:bg-violet-700 hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                useAllTime && 'pointer-events-none opacity-50',
              )}
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {useAllTime || !isDefaultRange ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onResetDateRange();
          }}
          className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Reset to default range"
        >
          <XIcon className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  );
}

function CallsFilterControls({
  layout,
  statusFilter,
  onStatusFilterChange,
  directionFilter,
  onDirectionFilterChange,
  selectedBranchId,
  onBranchIdChange,
  branches,
  startDate,
  endDate,
  useAllTime,
  onRangeChange,
  onUseAllTimeChange,
  onResetDateRange,
}: Omit<CallsFiltersBarProps, 'searchInput' | 'onSearchInputChange'> & {
  layout: 'row' | 'stack';
}) {
  const row = layout === 'row';
  const pickerTriggerClass = row
    ? 'h-9 min-w-[140px] shrink-0 sm:w-[200px]'
    : 'h-9 w-full min-w-0';
  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const statusOptions = useMemo<SearchableOptionRow[]>(
    () => TRANSCRIPT_STATUS_FILTER_OPTIONS.map((option) => ({ ...option })),
    [],
  );

  return (
    <div className={wrapClass}>
      <CallsDateRangePicker
        layout={layout}
        startDate={startDate}
        endDate={endDate}
        useAllTime={useAllTime}
        onRangeChange={onRangeChange}
        onUseAllTimeChange={onUseAllTimeChange}
        onResetDateRange={onResetDateRange}
      />
      <SearchableOptionListPicker
        selectedValue={directionFilter}
        onValueChange={(value) => {
          if (value === 'inbound' || value === 'outbound') {
            onDirectionFilterChange(value);
            return;
          }
          onDirectionFilterChange('all');
        }}
        options={DIRECTION_FILTER_OPTIONS}
        placeholderLabelWhenAll="All directions"
        searchPlaceholder="Search directions…"
        emptyMessage="No direction found."
        triggerIcon={<PhoneIncoming className="size-4 shrink-0" />}
        triggerClassName={pickerTriggerClass}
      />
      <SearchableBranchPicker
        branches={branches}
        selectedBranchId={selectedBranchId}
        onBranchChange={onBranchIdChange}
        triggerClassName={pickerTriggerClass}
      />
      <SearchableOptionListPicker
        selectedValue={statusFilter}
        onValueChange={(value) => {
          const nextStatus: CallsStatusFilter =
            value === 'pending' ||
            value === 'processing' ||
            value === 'ready' ||
            value === 'failed' ||
            value === 'skipped'
              ? value
              : 'all';
          onStatusFilterChange(nextStatus);
        }}
        options={statusOptions}
        placeholderLabelWhenAll="All statuses"
        searchPlaceholder="Search statuses…"
        emptyMessage="No status found."
        triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
        triggerClassName={pickerTriggerClass}
      />
    </div>
  );
}

/**
 * Visits/Leads-style toolbar: date, direction, branch, and status on the left; search on the right.
 */
export function CallsFiltersBar({
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
  directionFilter,
  onDirectionFilterChange,
  selectedBranchId,
  onBranchIdChange,
  branches,
  startDate,
  endDate,
  useAllTime,
  onRangeChange,
  onUseAllTimeChange,
  onResetDateRange,
}: CallsFiltersBarProps) {
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function resetAll() {
    onResetDateRange();
    onDirectionFilterChange('all');
    onBranchIdChange('all');
    onStatusFilterChange('all');
    onSearchInputChange('');
  }

  function renderSearchField(className?: string) {
    return (
      <div className={cn('relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]', className)}>
        <Input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search number, name, or CDR id"
          className={cn(filterToolbarSearchInputClassName, searchInput && 'pr-8')}
          aria-label="Search call recordings"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchInputChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const filterProps = {
    statusFilter,
    onStatusFilterChange,
    directionFilter,
    onDirectionFilterChange,
    selectedBranchId,
    onBranchIdChange,
    branches,
    startDate,
    endDate,
    useAllTime,
    onRangeChange,
    onUseAllTimeChange,
    onResetDateRange,
  };

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3">
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex w-full min-w-0 flex-row items-stretch gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(selectTriggerClass, 'h-9 min-w-0 flex-1 justify-center gap-2')}
            onClick={() => setFiltersDialogOpen(true)}
          >
            <Filter className="size-4 shrink-0" aria-hidden />
            Filter
          </Button>
        </div>
        {renderSearchField('w-full')}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Date range, direction, branch, and transcript status for call recordings.
            </DialogDescription>
          </DialogHeader>
          <CallsFilterControls {...filterProps} layout="stack" />
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

      <div className="hidden w-full min-w-0 items-center justify-between gap-3 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <CallsFilterControls {...filterProps} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">{renderSearchField()}</div>
      </div>
    </div>
  );
}
