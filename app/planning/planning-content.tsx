'use client';

import { useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useTasks, useTasksForUser, useUsers, useClients } from '@/api/hooks';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { usePlanningStore } from '@/store/planning-store';
import { PlanningTable } from '@/components/planning-table/planning-table';
import { PlanningFiltersBar } from './components/planning-filters-bar';
import type { Task } from '@/api/types/tasks';

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
      <h2 className="mb-4 text-base font-medium text-foreground sm:text-lg">
        Task history
      </h2>
      <PlanningFiltersBar
        canMyTasks={canMyTasks}
        users={users}
        clientsList={clientsList}
        startDate={startDate}
        endDate={endDate}
        useAllTime={useAllTime}
        myTasksOnly={myTasksOnly}
        selectedStatus={selectedStatus}
        selectedPriority={selectedPriority}
        selectedAssigneeId={selectedAssigneeId}
        selectedClientId={selectedClientId}
        filterOverdueOnly={filterOverdueOnly}
        dateRangePopoverOpen={dateRangePopoverOpen}
        onDateRangePopoverOpenChange={setDateRangePopoverOpen}
        onStartDateChange={setStartDate}
        onEndDateSelectAndClose={selectEndDateAndClose}
        onSetUseAllTime={setUseAllTime}
        onResetDateRange={resetDateRangeToDefault}
        onMyTasksOnlyChange={setMyTasksOnly}
        onSelectedStatusChange={setSelectedStatus}
        onSelectedPriorityChange={setSelectedPriority}
        onFilterOverdueChange={setFilterOverdueOnly}
        onSelectedClientIdChange={setSelectedClientId}
        onSelectedAssigneeIdChange={setSelectedAssigneeId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
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
