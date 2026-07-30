'use client';

import { useCallback, useRef, useState } from 'react';
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
}: UtcDateRangePickerProps) {
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
          {showAllTime ? (
            <div className="flex flex-col gap-3 border-b p-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={useAllTime ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSetUseAllTime?.(true)}
                >
                  All time
                </Button>
                <span className="text-xs text-muted-foreground">
                  or pick a UTC range below
                </span>
              </div>
            </div>
          ) : null}
          <Calendar
            mode="range"
            selected={draft}
            disabled={calendarDisabled}
            onSelect={(r) => {
              if (calendarDisabled) return;
              if (!r) {
                setDraft(undefined);
                return;
              }
              onSetUseAllTime?.(false);
              setDraft({
                from: r.from
                  ? utcCalendarDateFromLocalPickerDate(r.from)
                  : undefined,
                to: r.to ? utcCalendarDateFromLocalPickerDate(r.to) : undefined,
              });
            }}
            initialFocus
            {...reportsDateRangeCalendarProps}
          />
          <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={calendarDisabled}
                onClick={shortcutToday}
              >
                Today (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={calendarDisabled}
                onClick={shortcutThisMonth}
              >
                This month (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={calendarDisabled}
                onClick={shortcutWholeMonth}
              >
                Whole month (UTC)
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={calendarDisabled}
              className={cn(
                'border-transparent bg-violet-600 text-white shadow-sm',
                'hover:bg-violet-700 hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                calendarDisabled && 'pointer-events-none opacity-50'
              )}
              onClick={() => handleDatePopoverOpenChange(false)}
            >
              Done
            </Button>
          </div>
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
