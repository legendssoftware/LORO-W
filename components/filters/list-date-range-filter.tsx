'use client';

import { useCallback, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { reportsFilterPortalHighZ, reportsFilterSelectTriggerClass } from '@/components/filters/searchable-filter-comboboxes';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
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

export interface ListDateRangeValue {
  useAllTime: boolean;
  startDate: Date;
  endDate: Date;
}

/** All time, with this month stored so a later range pick has a starting point. */
export function createDefaultListDateRange(): ListDateRangeValue {
  const month = utcMonthStartThroughToday();
  return { useAllTime: true, startDate: month.start, endDate: month.end };
}

/** Query params for an inclusive range. Omitted when the filter is all time. */
export function listDateRangeQuery(value: ListDateRangeValue): {
  startDate?: string;
  endDate?: string;
} {
  if (value.useAllTime) return {};
  return {
    startDate: formatUtcYmd(value.startDate),
    endDate: formatUtcYmd(value.endDate),
  };
}

/**
 * Date filter with the visits shortcuts (all time, today, this month) and a range calendar.
 * State stays in the parent so it does not write to the visits store.
 */
export function ListDateRangeFilter({
  value,
  onChange,
}: {
  value: ListDateRangeValue;
  onChange: (value: ListDateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: value.startDate,
    to: value.endDate,
  });
  const skipApplyOnCloseRef = useRef(false);

  const rangeLabel = value.useAllTime
    ? 'All time'
    : formatUtcYmd(value.startDate) === formatUtcYmd(value.endDate)
      ? formatUtcCalendarLabel(value.startDate)
      : `${formatUtcCalendarLabel(value.startDate)} – ${formatUtcCalendarLabel(value.endDate)}`;

  const applyDraft = useCallback(
    (next: DateRange | undefined, useAllTime: boolean) => {
      if (useAllTime) {
        onChange({ ...value, useAllTime: true });
        return;
      }
      const from = next?.from ?? value.startDate;
      const to = next?.to ?? next?.from ?? value.endDate;
      const ordered = orderUtcCalendarRange(from, to);
      onChange({ useAllTime: false, startDate: ordered.start, endDate: ordered.end });
    },
    [onChange, value]
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      skipApplyOnCloseRef.current = false;
      setDraft({ from: value.startDate, to: value.endDate });
      setOpen(true);
      return;
    }
    if (!skipApplyOnCloseRef.current && !value.useAllTime) {
      applyDraft(draft, false);
    }
    skipApplyOnCloseRef.current = false;
    setOpen(false);
  }

  function chooseAllTime() {
    skipApplyOnCloseRef.current = true;
    onChange({ ...value, useAllTime: true });
    setOpen(false);
  }

  function chooseToday() {
    skipApplyOnCloseRef.current = true;
    const today = utcToday();
    onChange({ useAllTime: false, startDate: today, endDate: today });
    setOpen(false);
  }

  function chooseThisMonth() {
    skipApplyOnCloseRef.current = true;
    const month = utcMonthStartThroughToday();
    onChange({ useAllTime: false, startDate: month.start, endDate: month.end });
    setOpen(false);
  }

  function chooseWholeMonth() {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onChange({
      useAllTime: false,
      startDate: utcDateFromYmd(from),
      endDate: utcDateFromYmd(to),
    });
    setOpen(false);
  }

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              reportsFilterSelectTriggerClass,
              'h-9 min-w-[180px] justify-start text-left font-normal'
            )}
            aria-label="Filter by date"
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-[95vw] max-w-lg p-0 sm:w-auto', reportsFilterPortalHighZ)} align="start">
          <div className="flex flex-wrap gap-2 border-b p-2">
            <Button type="button" size="sm" variant={value.useAllTime ? 'default' : 'outline'} onClick={chooseAllTime}>
              All time
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={chooseToday}>
              Today
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={chooseThisMonth}>
              This month
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={chooseWholeMonth}>
              Whole month
            </Button>
          </div>
          <Calendar
            mode="range"
            selected={localPickerRangeFromUtcCalendarRange(draft)}
            defaultMonth={localPickerDateFromUtcCalendarDate(draft?.from ?? value.startDate)}
            onSelect={(range) => {
              if (!range) {
                setDraft(undefined);
                return;
              }
              setDraft({
                from: range.from ? utcCalendarDateFromLocalPickerDate(range.from) : undefined,
                to: range.to ? utcCalendarDateFromLocalPickerDate(range.to) : undefined,
              });
              onChange({
                useAllTime: false,
                startDate: range.from
                  ? utcCalendarDateFromLocalPickerDate(range.from)
                  : value.startDate,
                endDate: range.to
                  ? utcCalendarDateFromLocalPickerDate(range.to)
                  : range.from
                    ? utcCalendarDateFromLocalPickerDate(range.from)
                    : value.endDate,
              });
            }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
      {!value.useAllTime ? (
        <button
          type="button"
          className="ml-0.5 flex size-9 items-center justify-center rounded hover:bg-accent"
          aria-label="Clear date filter"
          onClick={() => onChange({ ...createDefaultListDateRange(), useAllTime: true })}
        >
          <XIcon className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  );
}
