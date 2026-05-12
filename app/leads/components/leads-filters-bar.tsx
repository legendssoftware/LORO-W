'use client';

import * as React from 'react';
import { format, isSameDay, startOfMonth } from 'date-fns';
import { CopyMinus, Filter, Upload as UploadIcon } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, XIcon } from '@/lib/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const portalHighZ = 'z-[10001]';

export interface LeadsFilterControlsProps {
  layout: 'row' | 'stack';
  listScope: 'me' | 'all';
  users: UserListItem[];
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  dateBasis: 'created' | 'activity';
  selectedStatus: string;
  selectedSource: string;
  selectedUserId: string;
  dateRangePopoverOpen: boolean;
  onDateRangePopoverOpenChange: (open: boolean) => void;
  onStartDateChange: (d: Date) => void;
  onEndDateSelectAndClose: (d: Date) => void;
  onSetUseAllTime: (v: boolean) => void;
  onDateBasisChange: (v: 'created' | 'activity') => void;
  onResetDateRange: () => void;
  onSetTodayActivity: () => void;
  onSelectedStatusChange: (v: string) => void;
  onSelectedSourceChange: (v: string) => void;
  onSelectedUserIdChange: (v: string) => void;
}

export function LeadsFilterControls({
  layout,
  listScope,
  users,
  startDate,
  endDate,
  useAllTime,
  dateBasis,
  selectedStatus,
  selectedSource,
  selectedUserId,
  dateRangePopoverOpen,
  onDateRangePopoverOpenChange,
  onStartDateChange,
  onEndDateSelectAndClose,
  onSetUseAllTime,
  onDateBasisChange,
  onResetDateRange,
  onSetTodayActivity,
  onSelectedStatusChange,
  onSelectedSourceChange,
  onSelectedUserIdChange,
}: LeadsFilterControlsProps) {
  const row = layout === 'row';
  const dateBtn = row
    ? 'h-9 min-w-[140px] shrink-0 justify-center gap-2 border-gray-200 bg-white text-foreground'
    : 'h-9 w-full min-w-[140px] justify-center gap-2 border-gray-200 bg-white text-foreground sm:w-auto';
  const basisTrigger = row
    ? 'h-9 min-w-[200px] w-[240px] shrink-0 border-gray-200 bg-white text-foreground disabled:opacity-60'
    : 'h-9 w-full min-w-0 border-gray-200 bg-white text-foreground disabled:opacity-60';
  const smallSelect = row
    ? 'h-9 min-w-[100px] w-[128px] shrink-0 border-gray-200 bg-white text-foreground'
    : 'h-9 w-full min-w-0 border-gray-200 bg-white text-foreground';
  const ownerSelect = row
    ? 'h-9 min-w-[140px] w-[200px] shrink-0 border-gray-200 bg-white text-foreground'
    : 'h-9 w-full min-w-0 border-gray-200 bg-white text-foreground';
  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const now = new Date();
  const isDefaultRange =
    !useAllTime &&
    isSameDay(startDate, startOfMonth(now)) &&
    isSameDay(endDate, now);

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-0', !row && 'w-full min-w-0')}>
        <Popover open={dateRangePopoverOpen} onOpenChange={onDateRangePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={dateBtn}>
              <CalendarIcon className="size-4" />
              {useAllTime
                ? 'All time'
                : startDate.getTime() === endDate.getTime()
                  ? format(startDate, 'MMM d, yyyy')
                  : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[10001] w-[80vw] max-w-[34rem] p-0"
            align="center"
          >
            <div className="flex flex-col gap-3 p-2">
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
                  or pick a date range below
                </span>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <div>
                  <p className="text-sm font-medium">Start date</p>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      if (d) onStartDateChange(d);
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">End date</p>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => {
                      if (d) onEndDateSelectAndClose(d);
                    }}
                  />
                </div>
              </div>
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
            aria-label="Reset to this month"
          >
            <XIcon className="size-4 text-red-600" />
          </span>
        ) : null}
      </div>

      <Select
        value={useAllTime ? 'created' : dateBasis}
        onValueChange={(v) => onDateBasisChange(v as 'created' | 'activity')}
        disabled={useAllTime}
      >
        <SelectTrigger
          className={basisTrigger}
          title={
            useAllTime
              ? 'Choose a date range to filter by created date or last activity'
              : 'Created: lead created in range. Last activity: updated in range (excludes never edited).'
          }
        >
          <SelectValue placeholder="Range applies to" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          <SelectItem value="created">Created in range</SelectItem>
          <SelectItem value="activity">
            <span className="flex flex-col items-start gap-0.5 text-left">
              <span>Last activity in range</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                Excludes leads never edited after creation
              </span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'h-9 shrink-0 border-gray-200 bg-white text-foreground',
          !row && 'w-full sm:w-auto'
        )}
        title="Sets range to today and filters by last activity (server: updated in range, edited after creation)."
        onClick={onSetTodayActivity}
      >
        Today&apos;s activity
      </Button>

      <Select value={selectedStatus || 'all'} onValueChange={onSelectedStatusChange}>
        <SelectTrigger className={smallSelect}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          {LEAD_STATUS_OPTIONS_WITH_ALL.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                <opt.icon className="size-4 shrink-0" />
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedSource || 'all'} onValueChange={onSelectedSourceChange}>
        <SelectTrigger className={smallSelect}>
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          {LEAD_SOURCE_OPTIONS_WITH_ALL.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                <opt.icon className="size-4 shrink-0" />
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {listScope === 'all' ? (
        <Select value={selectedUserId || 'all'} onValueChange={onSelectedUserIdChange}>
          <SelectTrigger className={ownerSelect}>
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent className={portalHighZ}>
            <SelectItem value="all">All users</SelectItem>
            {users.map((user) => {
              const fullName =
                [user.name, user.surname].filter(Boolean).join(' ') ||
                user.email ||
                `User ${user.uid}`;
              const imgSrc =
                user.photoURL ?? user.avatar ?? undefined;
              return (
                <SelectItem key={user.uid} value={String(user.uid)}>
                  <span className="flex items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={imgSrc} alt={fullName} />
                      <AvatarFallback className="text-xs">
                        {fullName !== `User ${user.uid}`
                          ? fullName.slice(0, 2).toUpperCase()
                          : String(user.uid).slice(-2)}
                      </AvatarFallback>
                    </Avatar>
                    {fullName}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
            'h-9 w-full border-gray-200 bg-white text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0',
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
