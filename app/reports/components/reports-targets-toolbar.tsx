'use client';

import { useCallback, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import {
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
} from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

export interface ReportsTargetsToolbarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onSetUseAllTime: (value: boolean) => void;
  onResetDateRange: () => void;
  showSearch?: boolean;
}

export function ReportsTargetsToolbar({
  searchInput,
  onSearchInputChange,
  startDate,
  endDate,
  useAllTime,
  onRangeChange,
  onSetUseAllTime,
  onResetDateRange,
  showSearch = true,
}: ReportsTargetsToolbarProps) {
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const skipApplyOnCloseRef = useRef(false);

  const today = utcToday();
  const isDefaultRange =
    !useAllTime &&
    formatUtcYmd(startDate) === formatUtcYmd(today) &&
    formatUtcYmd(endDate) === formatUtcYmd(today);

  const rangeLabel = useAllTime
    ? 'All time'
    : formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  const handleDatePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        skipApplyOnCloseRef.current = false;
        setDraft({ from: startDate, to: endDate });
        setDateRangePopoverOpen(true);
        return;
      }
      if (!skipApplyOnCloseRef.current && !useAllTime) {
        const from = draft?.from ?? startDate;
        const to = draft?.to ?? draft?.from ?? endDate;
        onRangeChange(orderUtcCalendarRange(from, to));
      }
      skipApplyOnCloseRef.current = false;
      setDateRangePopoverOpen(false);
    },
    [draft, useAllTime, startDate, endDate, onRangeChange]
  );

  const shortcutToday = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const t = utcToday();
    onSetUseAllTime(false);
    onRangeChange({ start: t, end: t });
    setDateRangePopoverOpen(false);
  }, [onSetUseAllTime, onRangeChange]);

  const shortcutThisMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    onSetUseAllTime(false);
    onRangeChange({ start, end });
    setDateRangePopoverOpen(false);
  }, [onSetUseAllTime, onRangeChange]);

  const shortcutWholeMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onSetUseAllTime(false);
    onRangeChange({ start: utcDateFromYmd(from), end: utcDateFromYmd(to) });
    setDateRangePopoverOpen(false);
  }, [onSetUseAllTime, onRangeChange]);

  function renderSearchField(className?: string) {
    if (!showSearch) return null;
    return (
      <div className={cn('relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]', className)}>
        <Input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Search name, email, or branch…"
          className={cn(filterToolbarSearchInputClassName, searchInput ? 'pr-8' : undefined)}
          data-tour="reports-targets-search"
          aria-label="Search targets by user"
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

  const datePicker = (
    <div className="flex items-center gap-0">
      <Popover open={dateRangePopoverOpen} onOpenChange={handleDatePopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              reportsFilterSelectTriggerClass,
              'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
            )}
            data-tour="reports-targets-date-filter"
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
            {rangeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-[95vw] max-w-lg p-0 sm:w-auto', reportsFilterPortalHighZ)}
          align="start"
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
              <span className="text-xs text-muted-foreground">or pick a UTC range below</span>
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
                from: r.from ? utcCalendarDateFromLocalPickerDate(r.from) : undefined,
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResetDateRange();
          }}
          className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Reset to today"
        >
          <XIcon className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="reports-targets-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        {datePicker}
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
          {renderSearchField()}
        </div>
      </div>
    </div>
  );
}
