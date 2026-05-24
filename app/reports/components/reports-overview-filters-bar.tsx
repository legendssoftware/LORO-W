'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, Filter } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
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
import { cn } from '@/lib/utils';
import { XIcon } from '@/lib/icons';
import {
  SearchableBranchPicker,
  SearchableUserPicker,
  reportsDateRangeCalendarProps,
  reportsDateRangePopoverContentClass,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
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

const selectTriggerClass = reportsFilterSelectTriggerClass;

function formatRangeButtonLabel(start: Date, end: Date): string {
  if (formatUtcYmd(start) === formatUtcYmd(end)) {
    return formatUtcCalendarLabel(start);
  }
  return `${formatUtcCalendarLabel(start)} – ${formatUtcCalendarLabel(end)}`;
}

export interface OverviewFilterControlsProps {
  layout: 'row' | 'stack';
  rangeStart: Date;
  rangeEnd: Date;
  rangePopoverOpen: boolean;
  onRangePopoverOpenChange: (open: boolean) => void;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  elevated: boolean;
  branches: BranchListItem[];
  reportingUsers: UserListItem[];
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  selectedOwnerUid: string;
  onOwnerChange: (uid: string) => void;
}

export function OverviewFilterControls({
  layout,
  rangeStart,
  rangeEnd,
  rangePopoverOpen,
  onRangePopoverOpenChange,
  onRangeChange,
  elevated,
  branches,
  reportingUsers,
  selectedBranchId,
  onBranchChange,
  selectedOwnerUid,
  onOwnerChange,
}: OverviewFilterControlsProps) {
  const row = layout === 'row';
  const rangeBtnWidth = row
    ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';
  const branchWidth = row
    ? 'w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]'
    : 'w-full shrink-0';
  const userWidth = row
    ? 'w-[190px] shrink-0 sm:min-w-[220px] sm:w-[220px]'
    : 'w-full shrink-0';

  const isDefaultRange = React.useMemo(() => {
    const { start, end } = utcMonthStartThroughToday();
    return (
      formatUtcYmd(rangeStart) === formatUtcYmd(start) &&
      formatUtcYmd(rangeEnd) === formatUtcYmd(end)
    );
  }, [rangeStart, rangeEnd]);

  const [draft, setDraft] = React.useState<DateRange | undefined>({
    from: rangeStart,
    to: rangeEnd,
  });
  const finalizeDraftToParent = React.useCallback(() => {
    const from = draft?.from ?? rangeStart;
    const to = draft?.to ?? draft?.from ?? rangeEnd;
    const ordered = orderUtcCalendarRange(from, to);
    onRangeChange(ordered);
  }, [draft, rangeStart, rangeEnd, onRangeChange]);

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setDraft({ from: rangeStart, to: rangeEnd });
    } else {
      finalizeDraftToParent();
    }
    onRangePopoverOpenChange(open);
  }

  function handleShortcutToday() {
    const t = utcToday();
    onRangeChange({ start: t, end: t });
    onRangePopoverOpenChange(false);
  }

  function handleShortcutThisMonth() {
    const { start, end } = utcMonthStartThroughToday();
    onRangeChange({ start, end });
    onRangePopoverOpenChange(false);
  }

  function handleShortcutWholeMonth() {
    const { from, to } = getUtcMonthRange(utcToday());
    onRangeChange({
      start: utcDateFromYmd(from),
      end: utcDateFromYmd(to),
    });
    onRangePopoverOpenChange(false);
  }

  return (
    <div
      className={cn(
        row
          ? 'flex flex-nowrap items-center gap-2'
          : 'flex w-full flex-col gap-4'
      )}
    >
      <div className={cn('flex items-center gap-0', !row && 'w-full min-w-0')}>
        <Popover open={rangePopoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(rangeBtnWidth, selectTriggerClass)}
            >
              <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              {formatRangeButtonLabel(rangeStart, rangeEnd)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              reportsDateRangePopoverContentClass,
              reportsFilterPortalHighZ
            )}
            align="center"
          >
            <Calendar
              mode="range"
              {...reportsDateRangeCalendarProps}
              selected={draft}
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
            />
            <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
              <div className="flex flex-wrap gap-2">
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
        {!isDefaultRange ? (
          <button
            type="button"
            onClick={() => {
              const r = utcMonthStartThroughToday();
              onRangeChange({ start: r.start, end: r.end });
            }}
            className="ml-0.5 shrink-0 rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Reset date range"
          >
            <XIcon className="size-4 text-red-600" />
          </button>
        ) : null}
      </div>

      {elevated ? (
        <>
          <SearchableBranchPicker
            branches={branches}
            selectedBranchId={selectedBranchId}
            onBranchChange={onBranchChange}
            triggerClassName={branchWidth}
          />
          <SearchableUserPicker
            users={reportingUsers}
            branches={branches}
            selectedUid={selectedOwnerUid}
            onUidChange={onOwnerChange}
            triggerClassName={userWidth}
          />
        </>
      ) : null}
    </div>
  );
}

export type ReportsOverviewFiltersBarProps = Omit<
  OverviewFilterControlsProps,
  'layout'
>;

export function ReportsOverviewFiltersBar(filterProps: ReportsOverviewFiltersBarProps) {
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
    <div className="flex flex-col gap-3">
      <div className="flex w-full min-w-0 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(
            selectTriggerClass,
            'h-9 w-full justify-center min-w-0'
          )}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          Filter
        </Button>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Adjust date range and scope for Overview charts.
            </DialogDescription>
          </DialogHeader>
          <OverviewFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:block w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
          <OverviewFilterControls {...filterProps} layout="row" />
        </div>
      </div>
    </div>
  );
}
