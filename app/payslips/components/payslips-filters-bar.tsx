'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, CircleDot, Eye, Filter, LayoutGrid, Send } from 'lucide-react';
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
import { PAYSLIP_STATUS_FILTER_OPTIONS } from '@/lib/payslips-scope';
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 border-border bg-background text-foreground sm:w-auto';

export function resetPayslipsDateRangeToDefault(
  onStartDateChange: (v: string) => void,
  onEndDateChange: (v: string) => void
) {
  const { start, end } = utcMonthStartThroughToday();
  onStartDateChange(formatUtcYmd(start));
  onEndDateChange(formatUtcYmd(end));
}

function formatRangeButtonLabel(start: Date, end: Date): string {
  if (formatUtcYmd(start) === formatUtcYmd(end)) {
    return formatUtcCalendarLabel(start);
  }
  return `${formatUtcCalendarLabel(start)} – ${formatUtcCalendarLabel(end)}`;
}

function statusIconFor(value: string): React.ReactNode {
  const v = value.toLowerCase();
  if (v === 'generated') return <CircleDot className="size-4 shrink-0" />;
  if (v === 'sent') return <Send className="size-4 shrink-0" />;
  if (v === 'viewed') return <Eye className="size-4 shrink-0" />;
  return <LayoutGrid className="size-4 shrink-0" />;
}

export interface PayslipsFiltersBarProps {
  canViewOrg: boolean;
  users: UserListItem[];
  branches: BranchListItem[];
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  selectedUserId: string;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onSetUseAllTime: (v: boolean) => void;
  onResetDateRange: () => void;
  onSelectedStatusChange: (v: string) => void;
  onSelectedUserIdChange: (v: string) => void;
}

function PayslipsFilterControls({
  layout,
  canViewOrg,
  users,
  branches,
  startDate,
  endDate,
  useAllTime,
  selectedStatus,
  selectedUserId,
  onRangeChange,
  onSetUseAllTime,
  onResetDateRange,
  onSelectedStatusChange,
  onSelectedUserIdChange,
}: PayslipsFiltersBarProps & { layout: 'row' | 'stack' }) {
  const row = layout === 'row';
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);

  const statusOptions: SearchableOptionRow[] = PAYSLIP_STATUS_FILTER_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    icon: statusIconFor(o.value),
  }));

  const statusVal = selectedStatus || 'all';

  const calendarSelected: DateRange | undefined = useAllTime
    ? undefined
    : { from: startDate, to: endDate };

  return (
    <div
      className={cn(
        row
          ? 'flex min-w-0 flex-wrap items-center gap-2'
          : 'flex flex-col gap-3'
      )}
    >
      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(selectTriggerClass, row ? 'w-auto' : 'w-full justify-start')}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0" />
            {useAllTime ? 'All time' : formatRangeButtonLabel(startDate, endDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-auto p-0', reportsFilterPortalHighZ)} align="start">
          <Calendar
            mode="range"
            selected={calendarSelected}
            onSelect={(range) => {
              if (!range?.from) return;
              const end = range.to ?? range.from;
              const ordered = orderUtcCalendarRange(range.from, end);
              onSetUseAllTime(false);
              onRangeChange({
                start: utcCalendarDateFromLocalPickerDate(ordered.start),
                end: utcCalendarDateFromLocalPickerDate(ordered.end),
              });
            }}
            numberOfMonths={1}
          />
          <div className="flex flex-wrap gap-2 border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                const { start, end } = utcMonthStartThroughToday();
                onSetUseAllTime(false);
                onRangeChange({ start, end });
                setDatePopoverOpen(false);
              }}
            >
              This month
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                const { from, to } = getUtcMonthRange(utcToday());
                onSetUseAllTime(false);
                onRangeChange(payslipsDateStateFromYmd(from, to));
                setDatePopoverOpen(false);
              }}
            >
              Full month
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                onSetUseAllTime(true);
                setDatePopoverOpen(false);
              }}
            >
              All time
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                onResetDateRange();
                onSetUseAllTime(false);
                setDatePopoverOpen(false);
              }}
            >
              Reset
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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

      {canViewOrg ? (
        <SearchableUserPicker
          users={users}
          branches={branches}
          selectedUid={selectedUserId === '' ? 'all' : selectedUserId}
          onUidChange={onSelectedUserIdChange}
          triggerClassName={cn(reportsFilterSelectTriggerClass, row ? 'w-auto' : 'w-full')}
        />
      ) : null}
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
              Filter by issue date, status, or employee.
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
