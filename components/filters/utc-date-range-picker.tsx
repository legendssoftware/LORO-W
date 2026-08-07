'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import {
  reportsDateRangeCalendarProps,
  reportsDateRangePopoverContentClass,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
} from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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

export interface UtcDateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  /** When provided, shows reset button when range differs from today. */
  onReset?: () => void;
  /** Reports targets: allow "All time" mode. Hidden when false. */
  showAllTime?: boolean;
  useAllTime?: boolean;
  onSetUseAllTime?: (value: boolean) => void;
  triggerClassName?: string;
  /** Narrower trigger for visualiser sidebar. */
  compact?: boolean;
  disabled?: boolean;
  /** Optional data-tour attribute for the trigger button. */
  dataTour?: string;
  /** Mobile filter sheet: inline single-month calendar instead of a popover. */
  stackLayout?: boolean;
}

export function UtcDateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  onReset,
  showAllTime = false,
  useAllTime = false,
  onSetUseAllTime,
  triggerClassName,
  compact = false,
  disabled = false,
  dataTour,
  stackLayout = false,
}: UtcDateRangePickerProps) {
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const skipApplyOnCloseRef = useRef(false);

  useEffect(() => {
    if (!stackLayout) return;
    setDraft({ from: startDate, to: endDate });
  }, [stackLayout, startDate, endDate]);

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
    onSetUseAllTime?.(false);
    onRangeChange({ start: t, end: t });
    setDateRangePopoverOpen(false);
  }, [onSetUseAllTime, onRangeChange]);

  const shortcutThisMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    onSetUseAllTime?.(false);
    onRangeChange({ start, end });
    setDateRangePopoverOpen(false);
  }, [onSetUseAllTime, onRangeChange]);

  const shortcutWholeMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onSetUseAllTime?.(false);
    onRangeChange({ start: utcDateFromYmd(from), end: utcDateFromYmd(to) });
    setDateRangePopoverOpen(false);
  }, [onSetUseAllTime, onRangeChange]);

  const calendarDisabled = useAllTime || disabled;

  const applyDraft = useCallback(() => {
    if (useAllTime) return;
    const from = draft?.from ?? startDate;
    const to = draft?.to ?? draft?.from ?? endDate;
    onRangeChange(orderUtcCalendarRange(from, to));
  }, [draft, useAllTime, startDate, endDate, onRangeChange]);

  const handleCalendarSelect = useCallback(
    (r: DateRange | undefined) => {
      if (calendarDisabled) return;
      if (!r) {
        setDraft(undefined);
        return;
      }
      onSetUseAllTime?.(false);
      setDraft({
        from: r.from ? utcCalendarDateFromLocalPickerDate(r.from) : undefined,
        to: r.to ? utcCalendarDateFromLocalPickerDate(r.to) : undefined,
      });
    },
    [calendarDisabled, onSetUseAllTime]
  );

  const calendarProps = stackLayout
    ? {
        numberOfMonths: 1,
        className: 'w-full [--cell-size:2.25rem]',
        classNames: {
          root: 'w-full',
          months: 'relative flex w-full flex-col',
          month: 'flex w-full flex-col gap-3',
        },
      }
    : reportsDateRangeCalendarProps;

  const allTimeSection = showAllTime ? (
    <div className="flex flex-col gap-2 border-b p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant={useAllTime ? 'default' : 'outline'}
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => onSetUseAllTime?.(true)}
        >
          All time
        </Button>
        <span className="text-xs text-muted-foreground">
          or pick a UTC range below
        </span>
      </div>
    </div>
  ) : null;

  const shortcutsFooter = (
    <div className="flex flex-col gap-2 border-t px-3 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={calendarDisabled}
          className="h-8 w-full justify-center px-2 text-xs sm:w-auto"
          onClick={shortcutToday}
        >
          Today (UTC)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={calendarDisabled}
          className="h-8 w-full justify-center px-2 text-xs sm:w-auto"
          onClick={shortcutThisMonth}
        >
          This month (UTC)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={calendarDisabled}
          className="h-8 w-full justify-center px-2 text-xs sm:w-auto"
          onClick={shortcutWholeMonth}
        >
          Whole month (UTC)
        </Button>
      </div>
      {!stackLayout ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={calendarDisabled}
            className={cn(
              'w-full border-transparent bg-violet-600 text-white shadow-sm sm:w-auto',
              'hover:bg-violet-700 hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
              calendarDisabled && 'pointer-events-none opacity-50'
            )}
            onClick={() => handleDatePopoverOpenChange(false)}
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );

  const calendarPanel = (
    <>
      {allTimeSection}
      <Calendar
        mode="range"
        selected={draft}
        disabled={calendarDisabled}
        onSelect={handleCalendarSelect}
        defaultMonth={startDate}
        initialFocus={!stackLayout}
        {...calendarProps}
      />
      {shortcutsFooter}
    </>
  );

  if (stackLayout) {
    return (
      <div className="w-full min-w-0 space-y-2" data-tour={dataTour}>
        <div className="flex min-w-0 items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-medium">{rangeLabel}</span>
          </div>
          {onReset && (useAllTime || !isDefaultRange) ? (
            <button
              type="button"
              onClick={onReset}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Reset to today"
            >
              <XIcon className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>
        <div className="w-full min-w-0 overflow-hidden rounded-md border">
          {calendarPanel}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={calendarDisabled}
          className={cn(
            'h-9 w-full border-transparent bg-violet-600 text-white shadow-sm',
            'hover:bg-violet-700 hover:text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
            calendarDisabled && 'pointer-events-none opacity-50'
          )}
          onClick={applyDraft}
        >
          Apply date range
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      <Popover open={dateRangePopoverOpen} onOpenChange={handleDatePopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              reportsFilterSelectTriggerClass,
              compact
                ? 'h-8 min-w-0 w-full justify-start text-left text-xs font-normal'
                : 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]',
              triggerClassName
            )}
            data-tour={dataTour}
          >
            <CalendarIcon
              className={cn(
                'shrink-0 text-muted-foreground',
                compact ? 'mr-1.5 size-3.5' : 'mr-2 size-4'
              )}
            />
            <span className="truncate">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(reportsDateRangePopoverContentClass, reportsFilterPortalHighZ)}
          align="start"
        >
          {calendarPanel}
        </PopoverContent>
      </Popover>
      {onReset && (useAllTime || !isDefaultRange) ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          className={cn(
            'ml-0.5 flex shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'h-8 w-8' : 'h-9 w-9'
          )}
          aria-label="Reset to today"
        >
          <XIcon className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  );
}
