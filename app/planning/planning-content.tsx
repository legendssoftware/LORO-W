'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { formatUtcYmd, utcToday } from '@/lib/utils/overview-daily-summary';
import { useTasks, useTasksForUser, useUsers, useClients, useBranches } from '@/api/hooks';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { usePlanningStore } from '@/store/planning-store';
import { TaskDetailDialog } from '@/components/planning-table/task-detail-dialog';
import { PlanningFiltersBar } from './components/planning-filters-bar';
import { PlanningInboxView } from './components/planning-inbox-view';
import {
  PlanningListPagination,
  readStoredPlanningPageSize,
  PLANNING_PAGE_SIZE_STORAGE_KEY,
  type PlanningPageSize,
} from './components/planning-list-pagination';
import { CreateTaskModal } from './components/create-task-modal';
import { PlanningRemindersPanel } from './components/planning-reminders-panel';
import { PlanningRoutesMap } from './components/planning-routes-map';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Task } from '@/api/types/tasks';

const SEARCH_DEBOUNCE_MS = 350;

type PlanningTab = 'all' | 'my-day' | 'routes';

function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((t) => {
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
}

export function PlanningContent() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [planningTab, setPlanningTab] = useState<PlanningTab>('all');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PlanningPageSize>(() => readStoredPlanningPageSize());
  const [searchInput, setSearchInput] = useState(
    () => usePlanningStore.getState().searchQuery
  );
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    usePlanningStore.getState().searchQuery.trim()
  );

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

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch(next);
      setSearchQuery(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput, setSearchQuery]);

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
  const effectiveStart = planningTab === 'my-day' ? utcToday() : startDate;
  const effectiveEnd = planningTab === 'my-day' ? utcToday() : endDate;

  const tasksParams = useMemo(
    () => ({
      page,
      limit: pageSize,
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
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [
      page,
      pageSize,
      effectiveUseAllTime,
      effectiveStart,
      effectiveEnd,
      selectedStatus,
      selectedPriority,
      selectedAssigneeId,
      selectedClientId,
      filterOverdueOnly,
      debouncedSearch,
    ]
  );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    effectiveUseAllTime,
    effectiveStart,
    effectiveEnd,
    selectedStatus,
    selectedPriority,
    selectedAssigneeId,
    selectedClientId,
    filterOverdueOnly,
    pageSize,
  ]);

  const tasksQuery = useTasks(tasksParams, {
    enabled: planningTab === 'all',
  });

  const myDayQuery = useTasksForUser(backendUserData?.uid ?? null, {
    enabled: planningTab === 'my-day' && !!backendUserData?.uid,
  });

  const allTasks = tasksQuery.data?.data ?? [];
  const listMeta = tasksQuery.data?.meta;
  const total = listMeta?.total ?? 0;
  const totalPages = listMeta?.totalPages ?? 0;

  const myDayTasks = useMemo(() => {
    const tasks = myDayQuery.data?.tasks ?? [];
    return tasks.filter((t) => {
      if (!t.deadline) return false;
      const d = formatUtcYmd(new Date(t.deadline));
      return d === todayYmd;
    });
  }, [myDayQuery.data?.tasks, todayYmd]);

  const myDayFilteredTasks = useMemo(
    () => filterTasksBySearch(myDayTasks, debouncedSearch),
    [myDayTasks, debouncedSearch]
  );

  const isLoading =
    planningTab === 'my-day' ? myDayQuery.isLoading : tasksQuery.isLoading;

  const openTask = useCallback((task: Task) => {
    setDetailTask(task);
    setDetailOpen(true);
  }, []);

  const refetchTasks = useCallback(() => {
    void tasksQuery.refetch();
    void myDayQuery.refetch();
  }, [tasksQuery, myDayQuery]);

  function handlePageSizeChange(size: PlanningPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(PLANNING_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col overflow-hidden px-3 py-5 sm:px-6 sm:py-8">
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
                  searchInput={searchInput}
                  onSearchChange={setSearchInput}
                />
                <div
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
                  data-tour="planning-task-table"
                >
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <PlanningInboxView
                      tasks={allTasks}
                      isLoading={isLoading}
                      emptyMessage="No tasks match your filters."
                      selectedTaskUid={detailTask?.uid ?? null}
                      onTaskClick={openTask}
                    />
                  </div>
                  <PlanningListPagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={pageSize}
                    isFetching={tasksQuery.isFetching && !tasksQuery.isLoading}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
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
              <div
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
                data-tour="planning-task-table"
              >
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <PlanningInboxView
                    tasks={myDayFilteredTasks}
                    isLoading={isLoading}
                    emptyMessage={
                      myDayTasks.length === 0
                        ? 'No tasks due today.'
                        : 'No tasks match your search.'
                    }
                    selectedTaskUid={detailTask?.uid ?? null}
                    onTaskClick={openTask}
                  />
                </div>
              </div>
              <PlanningRemindersPanel onOpenTask={openTask} />
            </div>
          </TabsContent>

          <TabsContent value="routes" className="mt-0 min-h-0 flex-1">
            <PlanningRoutesMap
              onOpenTask={(taskId) => {
                const t =
                  allTasks.find((x) => x.uid === taskId) ??
                  myDayTasks.find((x) => x.uid === taskId);
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
