'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { formatUtcYmd } from '@/app/reports/utils/overview-daily-summary';
import { useTasks, useUsers, useClients, useBranches } from '@/api/hooks';
import { usePlanningStore } from '@/store/planning-store';
import { PlanningTable } from '@/components/planning-table/planning-table';
import { PlanningFiltersBar } from './components/planning-filters-bar';
import { CreateTaskModal } from './components/create-task-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task } from '@/api/types/tasks';

export function PlanningContent() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-6xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8 lg:max-w-[88rem]">
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="planning-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Planning</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              View, track, and manage your tasks.
            </p>
          </div>
          <Button
            className={cn(
              'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
              'bg-violet-600 text-white hover:bg-violet-700',
              'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
              '[&_svg]:text-white focus-visible:ring-violet-500/40'
            )}
            data-tour="planning-create-button"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="size-4" />
            Create task
          </Button>
        </div>

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
        <CreateTaskModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
        />
      </main>
    </div>
  );
}
