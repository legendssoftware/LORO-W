'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, CircleDot, Eye, Filter, LayoutGrid, Send } from 'lucide-react';
import {
  SearchableOptionListPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { XIcon } from '@/lib/icons';
import { PAYSLIP_STATUS_FILTER_OPTIONS } from '@/lib/payslips-scope';
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 border-border bg-background text-foreground sm:w-auto';

export function resetPayslipsDateRangeToDefault(
  onStartDateChange: (v: string) => void,
  onEndDateChange: (v: string) => void,
  onSetUseAllTime: (v: boolean) => void
) {
  const { start, end } = utcMonthStartThroughToday();
  onStartDateChange(formatUtcYmd(start));
  onEndDateChange(formatUtcYmd(end));
  onSetUseAllTime(true);
}

function statusIconFor(value: string): React.ReactNode {
  const v = value.toLowerCase();
  if (v === 'generated') return <CircleDot className="size-4 shrink-0" />;
  if (v === 'sent') return <Send className="size-4 shrink-0" />;
  if (v === 'viewed') return <Eye className="size-4 shrink-0" />;
  return <LayoutGrid className="size-4 shrink-0" />;
}

export interface PayslipsFiltersBarProps {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onSetUseAllTime: (v: boolean) => void;
  onResetDateRange: () => void;
  onSelectedStatusChange: (v: string) => void;
}

function PayslipsFilterControls({
  layout,
  startDate,
  endDate,
  useAllTime,
  selectedStatus,
  onRangeChange,
  onSetUseAllTime,
  onResetDateRange,
  onSelectedStatusChange,
}: PayslipsFiltersBarProps & { layout: 'row' | 'stack' }) {
  const row = layout === 'row';
  const rangeBtnWidth = row
    ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const [dateRangePopoverOpen, setDateRangePopoverOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const skipApplyOnCloseRef = React.useRef(false);

  const statusOptions: SearchableOptionRow[] = PAYSLIP_STATUS_FILTER_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    icon: statusIconFor(o.value),
  }));

  const statusVal = selectedStatus || 'all';

  const rangeLabel = useAllTime
    ? 'All time'
    : formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  function handleDatePopoverOpenChange(open: boolean) {
    if (open) {
      skipApplyOnCloseRef.current = false;
      setDraft({ from: startDate, to: endDate });
      setDateRangePopoverOpen(true);
      return;
    }
    if (!skipApplyOnCloseRef.current && !useAllTime) {
      const from = draft?.from ?? startDate;
      const to = draft?.to ?? draft?.from ?? endDate;
      const ordered = orderUtcCalendarRange(from, to);
      onRangeChange({
        start: utcCalendarDateFromLocalPickerDate(ordered.start),
        end: utcCalendarDateFromLocalPickerDate(ordered.end),
      });
    }
    skipApplyOnCloseRef.current = false;
    setDateRangePopoverOpen(false);
  }

  const handleShortcutToday = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const t = utcToday();
    onSetUseAllTime(false);
    onRangeChange({ start: t, end: t });
    setDateRangePopoverOpen(false);
  }, [onRangeChange, onSetUseAllTime]);

  const handleShortcutThisMonth = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    onSetUseAllTime(false);
    onRangeChange({ start, end });
    setDateRangePopoverOpen(false);
  }, [onRangeChange, onSetUseAllTime]);

  const handleShortcutWholeMonth = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onSetUseAllTime(false);
    onRangeChange({
      start: utcDateFromYmd(from),
      end: utcDateFromYmd(to),
    });
    setDateRangePopoverOpen(false);
  }, [onRangeChange, onSetUseAllTime]);

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-0', !row && 'w-full min-w-0')}>
        <Popover open={dateRangePopoverOpen} onOpenChange={handleDatePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(rangeBtnWidth, reportsFilterSelectTriggerClass)}
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
              onSelect={(range) => {
                if (useAllTime) return;
                if (!range) {
                  setDraft(undefined);
                  return;
                }
                onSetUseAllTime(false);
                setDraft({
                  from: range.from
                    ? utcCalendarDateFromLocalPickerDate(range.from)
                    : undefined,
                  to: range.to
                    ? utcCalendarDateFromLocalPickerDate(range.to)
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
        {!useAllTime ? (
          <button
            type="button"
            onClick={onResetDateRange}
            className="ml-0.5 shrink-0 rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Reset to all time"
          >
            <XIcon className="size-4 text-red-600" />
          </button>
        ) : null}
      </div>

      <SearchableOptionListPicker
        selectedValue={statusVal}
        onValueChange={onSelectedStatusChange}
        options={statusOptions}
        placeholderLabelWhenAll="All statuses"
        searchPlaceholder="Search statuses…"
        emptyMessage="No status found."
        triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
        triggerClassName={cn(reportsFilterSelectTriggerClass, row ? 'w-auto' : 'w-full')}
      />
    </div>
  );
}

export function PayslipsFiltersBar(props: PayslipsFiltersBarProps) {
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

  return (
    <>
      <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">
        <PayslipsFilterControls layout="row" {...props} />
      </div>

      <div className="flex shrink-0 md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2"
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip filters</DialogTitle>
            <DialogDescription>
              Filter by issue date or status.
            </DialogDescription>
          </DialogHeader>
          <PayslipsFilterControls layout="stack" {...props} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function payslipsFilterDatesFromState(
  useAllTime: boolean,
  startDate: Date,
  endDate: Date
): { startDate?: string; endDate?: string } {
  if (useAllTime) return {};
  return {
    startDate: formatUtcYmd(startDate),
    endDate: formatUtcYmd(endDate),
  };
}

export function payslipsDateStateFromYmd(from: string, to: string): { start: Date; end: Date } {
  return {
    start: utcDateFromYmd(from),
    end: utcDateFromYmd(to),
  };
}
