'use client';

import { useMemo, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { formatUtcYmd, utcToday } from '@/app/reports/utils/overview-daily-summary';
import { useTasks, useTasksForUser, useUsers, useClients, useBranches } from '@/api/hooks';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { usePlanningStore } from '@/store/planning-store';
import { PlanningTable } from '@/components/planning-table/planning-table';
import { TaskDetailDialog } from '@/components/planning-table/task-detail-dialog';
import { PlanningFiltersBar } from './components/planning-filters-bar';
import { CreateTaskModal } from './components/create-task-modal';
import { PlanningRemindersPanel } from './components/planning-reminders-panel';
import { PlanningRoutesMap } from './components/planning-routes-map';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Task } from '@/api/types/tasks';

type PlanningTab = 'all' | 'my-day' | 'routes';

export function PlanningContent() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [planningTab, setPlanningTab] = useState<PlanningTab>('all');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { backendUserData } = useSessionSync();

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

  const applyMyDayRange = useCallback(() => {
    const today = utcToday();
    setUseAllTime(false);
    setDateRange(today, today);
  }, [setDateRange, setUseAllTime]);

  const handleTabChange = (value: string) => {
    const tab = value as PlanningTab;
    setPlanningTab(tab);
    if (tab === 'my-day') {
      applyMyDayRange();
    }
  };

  const { data: users = [] } = useUsers({ page: 1, limit: 100 });
  const { data: branches = [] } = useBranches();
  const { data: clientsList = [] } = useClients({
    page: 1,
    limit: 200,
  });

  const todayYmd = formatUtcYmd(utcToday());
  const effectiveUseAllTime = planningTab === 'my-day' ? false : useAllTime;
  const effectiveStart =
    planningTab === 'my-day' ? utcToday() : startDate;
  const effectiveEnd =
    planningTab === 'my-day' ? utcToday() : endDate;

  const tasksParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      ...(effectiveUseAllTime
        ? {}
        : {
            startDate: formatUtcYmd(effectiveStart),
            endDate: formatUtcYmd(effectiveEnd),
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
      effectiveUseAllTime,
      effectiveStart,
      effectiveEnd,
      selectedStatus,
      selectedPriority,
      selectedAssigneeId,
      selectedClientId,
      filterOverdueOnly,
    ]
  );

  const tasksQuery = useTasks(tasksParams, {
    enabled: planningTab !== 'my-day' || !backendUserData?.uid,
  });

  const myDayQuery = useTasksForUser(backendUserData?.uid ?? null, {
    enabled: planningTab === 'my-day' && !!backendUserData?.uid,
  });

  const orgTasks =
    planningTab === 'my-day'
      ? (myDayQuery.data?.tasks ?? []).filter((t) => {
          if (!t.deadline) return false;
          const d = formatUtcYmd(new Date(t.deadline));
          return d === todayYmd;
        })
      : (tasksQuery.data?.data ?? []);

  const isLoading =
    planningTab === 'my-day' ? myDayQuery.isLoading : tasksQuery.isLoading;

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

  const openTask = useCallback((task: Task) => {
    setDetailTask(task);
    setDetailOpen(true);
  }, []);

  const refetchTasks = useCallback(() => {
    void tasksQuery.refetch();
    void myDayQuery.refetch();
  }, [tasksQuery, myDayQuery]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="planning-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Planning</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Plan field work, routes, and follow-ups in one place.
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

        <Tabs value={planningTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-4 w-full justify-start sm:w-auto" data-tour="planning-tabs">
            <TabsTrigger value="all">All tasks</TabsTrigger>
            <TabsTrigger value="my-day">My day</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
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
                    isLoading={isLoading}
                    emptyMessage={
                      orgTasks.length === 0
                        ? 'No tasks match your filters.'
                        : 'No tasks match your search.'
                    }
                    onTaskUpdated={refetchTasks}
                    onTaskClick={openTask}
                  />
                </div>
              </div>
              <PlanningRemindersPanel onOpenTask={openTask} />
            </div>
          </TabsContent>

          <TabsContent value="my-day" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Tasks due today
              {backendUserData?.uid ? ' for your account' : ''}.
            </p>
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
              <div className="min-w-0 flex-1" data-tour="planning-task-table">
                <PlanningTable
                  tasks={filteredTasks}
                  isLoading={isLoading}
                  emptyMessage="No tasks due today."
                  onTaskUpdated={refetchTasks}
                  onTaskClick={openTask}
                />
              </div>
              <PlanningRemindersPanel onOpenTask={openTask} />
            </div>
          </TabsContent>

          <TabsContent value="routes" className="mt-0 min-h-0 flex-1">
            <PlanningRoutesMap
              onOpenTask={(taskId) => {
                const t = orgTasks.find((x) => x.uid === taskId);
                if (t) openTask(t);
                else {
                  setDetailTask({ uid: taskId } as Task);
                  setDetailOpen(true);
                }
              }}
            />
          </TabsContent>
        </Tabs>

        <CreateTaskModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={refetchTasks}
        />

        {detailTask && (
          <TaskDetailDialog
            task={detailTask}
            open={detailOpen}
            onOpenChange={(open) => {
              setDetailOpen(open);
              if (!open) setDetailTask(null);
            }}
            onTaskUpdated={refetchTasks}
          />
        )}
      </main>
    </div>
  );
}
