'use client';

import { useMemo } from 'react';
import { format, isSameDay, differenceInCalendarDays } from 'date-fns';
import { useTasks, useUsers } from '@/api/hooks';
import { usePlanningStore } from '@/store/planning-store';
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, XIcon } from '@/lib/icons';
import { PlanningTable } from '@/components/planning-table/planning-table';
import { cn } from '@/lib/utils';
import {
  TASK_STATUS_OPTIONS_WITH_ALL,
  TASK_PRIORITY_OPTIONS_WITH_ALL,
} from '@/lib/task-form-utils';
import type { Task } from '@/api/types/tasks';

const today = new Date();

export function PlanningContent() {
  const {
    startDate,
    endDate,
    useAllTime,
    selectedStatus,
    selectedPriority,
    selectedAssigneeId,
    searchQuery,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    setUseAllTime,
    selectEndDateAndClose,
    resetDateRangeToDefault,
    setSelectedStatus,
    setSelectedPriority,
    setSelectedAssigneeId,
    setSearchQuery,
  } = usePlanningStore();

  const { data: users = [] } = useUsers({ limit: 100 });

  const tasksParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      ...(useAllTime
        ? {}
        : {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          }),
      ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus as Task['status'] } : {}),
      ...(selectedPriority && selectedPriority !== 'all' ? { priority: selectedPriority as Task['priority'] } : {}),
      ...(selectedAssigneeId && selectedAssigneeId !== 'all' && !Number.isNaN(Number(selectedAssigneeId))
        ? { assigneeId: Number(selectedAssigneeId) }
        : {}),
    }),
    [useAllTime, startDate, endDate, selectedStatus, selectedPriority, selectedAssigneeId]
  );

  const tasksQuery = useTasks(tasksParams);
  const tasks = tasksQuery.data?.data ?? [];

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      const assigneeNames = (t.assignees ?? [])
        .map((a) => [a.name, a.surname].filter(Boolean).join(' '))
        .join(' ');
      const clientNames = (t.clients ?? []).map((c) => c.name).join(' ');
      const searchable = [
        t.title,
        t.description,
        t.status,
        t.priority,
        assigneeNames,
        clientNames,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [tasks, searchQuery]);

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium text-foreground">Task history</h2>
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0"
        data-tour="planning-toolbar"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0">
            <Popover open={dateRangePopoverOpen} onOpenChange={setDateRangePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[140px] justify-center gap-2 border-gray-200 bg-white text-foreground"
                >
                  <CalendarIcon className="size-4" />
                  {useAllTime
                    ? 'All time'
                    : startDate.getTime() === endDate.getTime()
                      ? format(startDate, 'MMM d, yyyy')
                      : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto min-w-[480px] p-0" align="start">
                <div className="flex flex-col gap-3 p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={useAllTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseAllTime(true)}
                    >
                      All time
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      or pick a date range below
                    </span>
                  </div>
                  <div className="flex flex-row gap-6">
                    <div>
                      <p className="text-sm font-medium">Start date</p>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (d) setStartDate(d);
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">End date</p>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          if (d) selectEndDateAndClose(d);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {(() => {
              const isDefaultRange =
                !useAllTime &&
                isSameDay(endDate, today) &&
                differenceInCalendarDays(endDate, startDate) === 30;
              return useAllTime || !isDefaultRange ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetDateRangeToDefault();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      resetDateRangeToDefault();
                    }
                  }}
                  className="ml-0.5 shrink-0 cursor-pointer rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Reset to last 30 days"
                >
                  <XIcon className="size-4 text-red-600" />
                </span>
              ) : null;
            })()}
          </div>
          <Select
            value={selectedStatus || 'all'}
            onValueChange={(v) => setSelectedStatus(v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
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
          <Select
            value={selectedPriority || 'all'}
            onValueChange={(v) => setSelectedPriority(v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
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
            value={selectedAssigneeId || 'all'}
            onValueChange={(v) => setSelectedAssigneeId(v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((user) => {
                const fullName =
                  [user.name, user.surname].filter(Boolean).join(' ').trim() ||
                  user.email ||
                  `User ${user.uid}`;
                const imgSrc =
                  (user as { photoURL?: string | null; avatar?: string | null }).photoURL ??
                  (user as { photoURL?: string | null; avatar?: string | null }).avatar ??
                  undefined;
                return (
                  <SelectItem key={user.uid} value={String(user.uid)}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-6 shrink-0">
                        <AvatarImage src={imgSrc} alt={fullName} />
                        <AvatarFallback className="text-xs">
                          {fullName !== `User ${user.uid}` ? fullName.slice(0, 2).toUpperCase() : String(user.uid).slice(-2)}
                        </AvatarFallback>
                      </Avatar>
                      {fullName}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <div className="relative w-56 min-w-0 shrink sm:w-64">
            <Input
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'h-9 w-full border-gray-200 bg-white text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0',
                searchQuery && 'pr-8'
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div data-tour="planning-task-table">
        <PlanningTable
          tasks={filteredTasks}
          isLoading={tasksQuery.isLoading}
          emptyMessage={tasks.length === 0 ? 'No tasks match your filters.' : 'No tasks match your search.'}
          onTaskUpdated={() => tasksQuery.refetch()}
        />
      </div>
    </section>
  );
}
