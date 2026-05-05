'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Building2, CalendarIcon, Filter, List, User } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/hooks';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OverviewTimeframe } from '@/app/reports/utils/overview-daily-summary';
import {
  formatUtcYmd,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

export interface OverviewFilterControlsProps {
  layout: 'row' | 'stack';
  timeframe: OverviewTimeframe;
  onTimeframeChange: (v: OverviewTimeframe) => void;
  dayPopoverOpen: boolean;
  onDayPopoverOpenChange: (open: boolean) => void;
  monthPopoverOpen: boolean;
  onMonthPopoverOpenChange: (open: boolean) => void;
  selectedDay: Date;
  onSelectedDayChange: (d: Date) => void;
  monthAnchor: Date;
  onMonthAnchorChange: (d: Date) => void;
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
  timeframe,
  onTimeframeChange,
  dayPopoverOpen,
  onDayPopoverOpenChange,
  monthPopoverOpen,
  onMonthPopoverOpenChange,
  selectedDay,
  onSelectedDayChange,
  monthAnchor,
  onMonthAnchorChange,
  elevated,
  branches,
  reportingUsers,
  selectedBranchId,
  onBranchChange,
  selectedOwnerUid,
  onOwnerChange,
}: OverviewFilterControlsProps) {
  const row = layout === 'row';
  const triggerWidth = row
    ? (
        'w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]'
      )
    : 'w-full shrink-0';
  const dayBtnWidth = row
    ? 'h-9 w-[190px] shrink-0 justify-start text-left font-normal sm:w-[220px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';
  const monthBtnWidth = row
    ? 'h-9 w-[210px] shrink-0 justify-start text-left font-normal sm:w-[240px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';
  const branchWidth = row
    ? 'w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]'
    : 'w-full shrink-0';
  const userWidth = row
    ? 'w-[190px] shrink-0 sm:min-w-[220px] sm:w-[220px]'
    : 'w-full shrink-0';

  return (
    <div
      className={cn(
        row
          ? 'flex flex-nowrap items-center gap-2'
          : 'flex w-full flex-col gap-4'
      )}
    >
      <Select
        value={timeframe}
        onValueChange={(v) => onTimeframeChange(v as OverviewTimeframe)}
      >
        <SelectTrigger className={cn(selectTriggerClass, triggerWidth)}>
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Single day (hourly)</SelectItem>
          <SelectItem value="month">Month (daily)</SelectItem>
        </SelectContent>
      </Select>

      {timeframe === 'day' ? (
        <Popover open={dayPopoverOpen} onOpenChange={onDayPopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(dayBtnWidth, selectTriggerClass)}
            >
              <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              {formatUtcYmd(selectedDay)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[80vw] max-w-sm p-0 sm:w-auto"
            align="center"
          >
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={(d) => {
                if (d)
                  onSelectedDayChange(
                    new Date(
                      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
                    )
                  );
              }}
              initialFocus
            />
            <div className="flex flex-wrap justify-end gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectedDayChange(utcToday())}
              >
                Today (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDayPopoverOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={monthPopoverOpen} onOpenChange={onMonthPopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(monthBtnWidth, selectTriggerClass)}
            >
              <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              {format(monthAnchor, 'MMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[80vw] max-w-sm p-0 sm:w-auto"
            align="center"
          >
            <Calendar
              mode="single"
              selected={monthAnchor}
              onSelect={(d) => {
                if (d)
                  onMonthAnchorChange(
                    new Date(
                      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
                    )
                  );
              }}
              initialFocus
            />
            <div className="flex flex-wrap justify-end gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMonthAnchorChange(utcToday())}
              >
                This month (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMonthPopoverOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {elevated ? (
        <>
          <Select value={selectedBranchId} onValueChange={onBranchChange}>
            <SelectTrigger className={cn(selectTriggerClass, branchWidth)}>
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.uid} value={String(b.uid)}>
                  {getBranchDisplayLabel(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedOwnerUid} onValueChange={onOwnerChange}>
            <SelectTrigger className={cn(selectTriggerClass, userWidth)}>
              <User className="size-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {reportingUsers.map((u) => (
                <SelectItem key={u.uid} value={String(u.uid)}>
                  {[u.name, u.surname].filter(Boolean).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : null}
    </div>
  );
}

export interface ReportsOverviewFiltersBarProps
  extends Omit<OverviewFilterControlsProps, 'layout'> {
  onOpenSummary: () => void;
}

export function ReportsOverviewFiltersBar({
  onOpenSummary,
  ...filterProps
}: ReportsOverviewFiltersBarProps) {
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

  const summaryButtonDesktop = (
    <div className={cn('flex shrink-0', 'w-[150px] sm:w-auto')}>
      <Button
        type="button"
        variant="outline"
        className={cn(selectTriggerClass, 'h-9 w-full shrink-0 sm:w-auto')}
        onClick={onOpenSummary}
      >
        <List className="mr-2 size-4 shrink-0" aria-hidden />
        Summary
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full min-w-0 flex-row items-stretch justify-between gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(
            selectTriggerClass,
            'h-9 flex-1 basis-0 justify-center sm:w-full min-w-0'
          )}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        <div className="flex min-w-0 flex-1 basis-0">
          <Button
            type="button"
            variant="outline"
            className={cn(
              selectTriggerClass,
              'h-9 w-full justify-center sm:w-full min-w-0'
            )}
            onClick={onOpenSummary}
          >
            <List className="mr-2 size-4 shrink-0" aria-hidden />
            Summary
          </Button>
        </div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Adjust timeframe, date range, and scope for Overview charts.
            </DialogDescription>
          </DialogHeader>
          <OverviewFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:block w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
          <OverviewFilterControls {...filterProps} layout="row" />
          {summaryButtonDesktop}
        </div>
      </div>
    </div>
  );
}
