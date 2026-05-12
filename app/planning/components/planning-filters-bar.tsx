'use client';

import * as React from 'react';
import {
  format,
  isSameDay,
  differenceInCalendarDays,
} from 'date-fns';
import { Filter } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { ClientListItem } from '@/api/types/clients';
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
import { CalendarIcon, StoreIcon, XIcon } from '@/lib/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  TASK_STATUS_OPTIONS_WITH_ALL,
  TASK_PRIORITY_OPTIONS_WITH_ALL,
} from '@/lib/task-form-utils';
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 bg-white border-gray-200 text-foreground sm:w-auto';

const portalHighZ = 'z-[10001]';

export interface PlanningFilterControlsProps {
  layout: 'row' | 'stack';
  canMyTasks: boolean;
  users: UserListItem[];
  clientsList: ClientListItem[];
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  myTasksOnly: boolean;
  selectedStatus: string;
  selectedPriority: string;
  selectedAssigneeId: string;
  selectedClientId: string;
  filterOverdueOnly: boolean;
  dateRangePopoverOpen: boolean;
  onDateRangePopoverOpenChange: (open: boolean) => void;
  onStartDateChange: (d: Date) => void;
  onEndDateSelectAndClose: (d: Date) => void;
  onSetUseAllTime: (v: boolean) => void;
  onResetDateRange: () => void;
  onMyTasksOnlyChange: (v: boolean) => void;
  onSelectedStatusChange: (v: string) => void;
  onSelectedPriorityChange: (v: string) => void;
  onFilterOverdueChange: (overdue: boolean) => void;
  onSelectedClientIdChange: (v: string) => void;
  onSelectedAssigneeIdChange: (v: string) => void;
}

export function PlanningFilterControls({
  layout,
  canMyTasks,
  users,
  clientsList,
  startDate,
  endDate,
  useAllTime,
  myTasksOnly,
  selectedStatus,
  selectedPriority,
  selectedAssigneeId,
  selectedClientId,
  filterOverdueOnly,
  dateRangePopoverOpen,
  onDateRangePopoverOpenChange,
  onStartDateChange,
  onEndDateSelectAndClose,
  onSetUseAllTime,
  onResetDateRange,
  onMyTasksOnlyChange,
  onSelectedStatusChange,
  onSelectedPriorityChange,
  onFilterOverdueChange,
  onSelectedClientIdChange,
  onSelectedAssigneeIdChange,
}: PlanningFilterControlsProps) {
  const row = layout === 'row';
  const todayCheck = new Date();
  const isDefaultRange =
    !useAllTime &&
    isSameDay(endDate, todayCheck) &&
    differenceInCalendarDays(endDate, startDate) === 30;
  const dateBtn = row
    ? 'h-9 min-w-[140px] shrink-0 justify-center gap-2 border-gray-200 bg-white text-foreground'
    : 'h-9 w-full min-w-[140px] justify-center gap-2 border-gray-200 bg-white text-foreground sm:w-auto';
  const stdSelect = row
    ? 'h-9 min-w-[140px] w-[200px] shrink-0 border-gray-200 bg-white text-foreground'
    : 'h-9 w-full min-w-0 border-gray-200 bg-white text-foreground';
  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

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
            aria-label="Reset to last 30 days"
          >
            <XIcon className="size-4 text-red-600" />
          </span>
        ) : null}
      </div>

      <Select
        value={myTasksOnly ? 'mine' : 'org'}
        onValueChange={(v) => onMyTasksOnlyChange(v === 'mine')}
        disabled={!canMyTasks}
      >
        <SelectTrigger className={stdSelect}>
          <SelectValue placeholder="Scope" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          <SelectItem value="org">All assignees</SelectItem>
          <SelectItem value="mine" disabled={!canMyTasks}>
            My tasks
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedStatus || 'all'} onValueChange={onSelectedStatusChange}>
        <SelectTrigger className={stdSelect}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          {TASK_STATUS_OPTIONS_WITH_ALL.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                <opt.icon className="size-4 shrink-0" />
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedPriority || 'all'} onValueChange={onSelectedPriorityChange}>
        <SelectTrigger className={stdSelect}>
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          {TASK_PRIORITY_OPTIONS_WITH_ALL.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                <opt.icon className="size-4 shrink-0" />
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filterOverdueOnly ? 'overdue' : 'all'}
        onValueChange={(v) => onFilterOverdueChange(v === 'overdue')}
      >
        <SelectTrigger className={stdSelect}>
          <SelectValue placeholder="Deadline" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          <SelectItem value="all">All deadlines</SelectItem>
          <SelectItem value="overdue">Overdue only</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={selectedClientId || 'all'}
        onValueChange={(v) => onSelectedClientIdChange(v === 'all' ? '' : v)}
      >
        <SelectTrigger className={stdSelect}>
          <SelectValue placeholder="All clients" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          <SelectItem value="all">All clients</SelectItem>
          {clientsList.map((c) => (
            <SelectItem key={c.uid} value={String(c.uid)}>
              <span className="flex items-center gap-2">
                <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={myTasksOnly ? 'all' : selectedAssigneeId || 'all'}
        onValueChange={onSelectedAssigneeIdChange}
        disabled={myTasksOnly}
      >
        <SelectTrigger
          className={cn(stdSelect, myTasksOnly && 'opacity-70')}
        >
          <SelectValue placeholder="All users" />
        </SelectTrigger>
        <SelectContent className={portalHighZ}>
          <SelectItem value="all">All users</SelectItem>
          {users.map((user) => {
            const fullName =
              [user.name, user.surname].filter(Boolean).join(' ').trim() ||
              user.email ||
              `User ${user.uid}`;
            const imgSrc = user.photoURL ?? user.avatar ?? undefined;
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

      {myTasksOnly ? (
        <span
          className={cn(
            'text-xs text-muted-foreground',
            row ? 'max-w-[200px]' : 'w-full'
          )}
        >
          Assignee filter is applied via{' '}
          <span className="font-medium text-foreground">My tasks</span>.
        </span>
      ) : null}
    </div>
  );
}

export interface PlanningFiltersBarProps
  extends Omit<PlanningFilterControlsProps, 'layout'> {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function PlanningFiltersBar({
  searchQuery,
  onSearchChange,
  ...filterProps
}: PlanningFiltersBarProps) {
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
          placeholder="Search tasks…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'h-9 w-full border-gray-200 bg-white text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0',
            searchQuery && 'pr-8'
          )}
        />
        {searchQuery ? (
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

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="planning-toolbar">
      <div className="flex md:hidden flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full justify-center gap-2')}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        {renderSearchField('w-full')}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Date range, scope, status, priority, client, and assignee.
            </DialogDescription>
          </DialogHeader>
          <PlanningFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <PlanningFilterControls {...filterProps} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {renderSearchField()}
        </div>
      </div>
    </div>
  );
}
