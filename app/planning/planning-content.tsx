'use client';

import { useMemo } from 'react';
import {
  format,
  isSameDay,
  differenceInCalendarDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { useTasks, useTasksForUser, useUsers, useClients } from '@/api/hooks';
import { useSessionSync } from '@/api/hooks/use-session-sync';
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
import { CalendarIcon, StoreIcon, XIcon } from '@/lib/icons';
import { PlanningTable } from '@/components/planning-table/planning-table';
import { cn } from '@/lib/utils';
import {
  TASK_STATUS_OPTIONS_WITH_ALL,
  TASK_PRIORITY_OPTIONS_WITH_ALL,
} from '@/lib/task-form-utils';
import type { Task } from '@/api/types/tasks';

const today = new Date();
const portalSelectContentClass = 'z-[10001]';

function taskInDateRange(
  t: Task,
  useAllTime: boolean,
  startDate: Date,
  endDate: Date
): boolean {
  if (useAllTime) return true;
  const start = startOfDay(startDate).getTime();
  const end = endOfDay(endDate).getTime();
  const times: number[] = [];
  if (t.deadline) times.push(new Date(t.deadline).getTime());
  if (t.createdAt) times.push(new Date(t.createdAt).getTime());
  if (times.length === 0) return true;
  return times.some((ts) => ts >= start && ts <= end);
}

export function PlanningContent() {
  const {
    startDate,
    endDate,
    useAllTime,
    selectedStatus,
    selectedPriority,
    selectedAssigneeId,
    selectedClientId,
    filterOverdueOnly,
    myTasksOnly,
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
    setSelectedClientId,
    setFilterOverdueOnly,
    setMyTasksOnly,
    setSearchQuery,
  } = usePlanningStore();

  const { backendUserData } = useSessionSync();
  const myUserUid = backendUserData?.uid;
  const canMyTasks = myUserUid != null && myUserUid > 0;

  const { data: users = [] } = useUsers({ page: 1, limit: 100 });
  const { data: clientsList = [] } = useClients({
    page: 1,
    limit: 200,
  });

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
      ...(selectedStatus && selectedStatus !== 'all'
        ? { status: selectedStatus as Task['status'] }
        : {}),
      ...(selectedPriority && selectedPriority !== 'all'
        ? { priority: selectedPriority as Task['priority'] }
        : {}),
      ...(selectedAssigneeId &&
      selectedAssigneeId !== 'all' &&
      !Number.isNaN(Number(selectedAssigneeId))
        ? { assigneeId: Number(selectedAssigneeId) }
        : {}),
      ...(selectedClientId &&
      selectedClientId !== 'all' &&
      !Number.isNaN(Number(selectedClientId))
        ? { clientId: Number(selectedClientId) }
        : {}),
      ...(filterOverdueOnly ? { isOverdue: true as const } : {}),
    }),
    [
      useAllTime,
      startDate,
      endDate,
      selectedStatus,
      selectedPriority,
      selectedAssigneeId,
      selectedClientId,
      filterOverdueOnly,
    ]
  );

  const tasksQuery = useTasks(tasksParams, { enabled: !myTasksOnly });
  const tasksForUserQuery = useTasksForUser(myUserUid, {
    enabled: myTasksOnly && canMyTasks,
  });

  const orgTasks = tasksQuery.data?.data ?? [];
  const myTasksRaw = tasksForUserQuery.data?.tasks ?? [];
  const baseTasks = myTasksOnly ? myTasksRaw : orgTasks;

  const afterScopeFilters = useMemo(() => {
    if (!myTasksOnly) return baseTasks;
    return baseTasks.filter((t) => {
      if (filterOverdueOnly && !t.isOverdue) return false;
      if (selectedStatus && selectedStatus !== 'all' && t.status !== selectedStatus) {
        return false;
      }
      if (
        selectedPriority &&
        selectedPriority !== 'all' &&
        t.priority !== selectedPriority
      ) {
        return false;
      }
      if (selectedClientId && selectedClientId !== 'all') {
        const cid = Number(selectedClientId);
        if (
          !Number.isFinite(cid) ||
          !(t.clients ?? []).some((c) => c.uid === cid)
        ) {
          return false;
        }
      }
      return taskInDateRange(t, useAllTime, startDate, endDate);
    });
  }, [
    baseTasks,
    myTasksOnly,
    filterOverdueOnly,
    selectedStatus,
    selectedPriority,
    selectedClientId,
    useAllTime,
    startDate,
    endDate,
  ]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return afterScopeFilters;
    const q = searchQuery.trim().toLowerCase();
    return afterScopeFilters.filter((t) => {
      const assigneeNames = (t.assignees ?? [])
        .map((a) => [a.name, a.surname].filter(Boolean).join(' '))
        .join(' ');
      const clientNames = (t.clients ?? []).map((c) => c.name).join(' ');
      const searchable = [
        t.title,
        t.description,
        t.comment,
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
  }, [afterScopeFilters, searchQuery]);

  const isLoading = myTasksOnly
    ? myTasksOnly && canMyTasks
      ? tasksForUserQuery.isLoading
      : false
    : tasksQuery.isLoading;

  function refetchTasks() {
    if (myTasksOnly && canMyTasks) void tasksForUserQuery.refetch();
    else void tasksQuery.refetch();
  }

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
            value={myTasksOnly ? 'mine' : 'org'}
            onValueChange={(v) => setMyTasksOnly(v === 'mine')}
            disabled={!canMyTasks}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent className={portalSelectContentClass}>
              <SelectItem value="org">All assignees</SelectItem>
              <SelectItem value="mine" disabled={!canMyTasks}>
                My tasks
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedStatus || 'all'}
            onValueChange={(v) => setSelectedStatus(v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className={portalSelectContentClass}>
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
            <SelectContent className={portalSelectContentClass}>
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
            onValueChange={(v) => setFilterOverdueOnly(v === 'overdue')}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="Deadline" />
            </SelectTrigger>
            <SelectContent className={portalSelectContentClass}>
              <SelectItem value="all">All deadlines</SelectItem>
              <SelectItem value="overdue">Overdue only</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedClientId || 'all'}
            onValueChange={(v) => setSelectedClientId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent className={portalSelectContentClass}>
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
            onValueChange={(v) => setSelectedAssigneeId(v)}
            disabled={myTasksOnly}
          >
            <SelectTrigger
              className={cn(
                'h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground',
                myTasksOnly && 'opacity-70'
              )}
            >
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent className={portalSelectContentClass}>
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
            <span className="text-xs text-muted-foreground max-w-[200px]">
              Assignee filter is applied via <span className="font-medium text-foreground">My tasks</span>.
            </span>
          ) : null}
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
          isLoading={isLoading}
          emptyMessage={
            myTasksOnly && !canMyTasks
              ? 'Sign in and sync your profile to load your tasks.'
              : afterScopeFilters.length === 0
                ? 'No tasks match your filters.'
                : 'No tasks match your search.'
          }
          onTaskUpdated={refetchTasks}
        />
      </div>
    </section>
  );
}
