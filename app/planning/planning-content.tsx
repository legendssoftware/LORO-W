'use client';

import { useMemo } from 'react';
import { formatUtcYmd } from '@/app/reports/utils/overview-daily-summary';
import { useTasks, useUsers, useClients, useBranches } from '@/api/hooks';
import { usePlanningStore } from '@/store/planning-store';
import { PlanningTable } from '@/components/planning-table/planning-table';
import { PlanningFiltersBar } from './components/planning-filters-bar';
import type { Task } from '@/api/types/tasks';

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
    searchQuery,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setUseAllTime,
    resetDateRangeToDefault,
    setSelectedStatus,
    setSelectedPriority,
    setSelectedAssigneeId,
    setSelectedClientId,
    setFilterOverdueOnly,
    setSearchQuery,
    setDateRange,
  } = usePlanningStore();

  const { data: users = [] } = useUsers({ page: 1, limit: 100 });
  const { data: branches = [] } = useBranches();
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
            startDate: formatUtcYmd(startDate),
            endDate: formatUtcYmd(endDate),
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

  const tasksQuery = useTasks(tasksParams);
  const orgTasks = tasksQuery.data?.data ?? [];

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return orgTasks;
    const q = searchQuery.trim().toLowerCase();
    return orgTasks.filter((t) => {
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
  }, [orgTasks, searchQuery]);

  return (
    <section>
      <h2 className="mb-4 text-base font-medium text-foreground sm:text-lg">
        Task history
      </h2>
      <PlanningFiltersBar
        users={users}
        branches={branches}
        clientsList={clientsList}
        startDate={startDate}
        endDate={endDate}
        useAllTime={useAllTime}
        selectedStatus={selectedStatus}
        selectedPriority={selectedPriority}
        selectedAssigneeId={selectedAssigneeId}
        selectedClientId={selectedClientId}
        filterOverdueOnly={filterOverdueOnly}
        dateRangePopoverOpen={dateRangePopoverOpen}
        onDateRangePopoverOpenChange={setDateRangePopoverOpen}
        onSetUseAllTime={setUseAllTime}
        onRangeChange={setDateRange}
        onResetDateRange={resetDateRangeToDefault}
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
          isLoading={tasksQuery.isLoading}
          emptyMessage={
            orgTasks.length === 0
              ? 'No tasks match your filters.'
              : 'No tasks match your search.'
          }
          onTaskUpdated={() => void tasksQuery.refetch()}
        />
      </div>
    </section>
  );
}
