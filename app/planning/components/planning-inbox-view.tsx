'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { CalendarClock, ChevronRight, Loader2Icon } from 'lucide-react';
import type { Task } from '@/api/types/tasks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
} from '@/lib/task-form-utils';

function optionLabel(
  options: { value: string; label: string }[],
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return options.find((o) => o.value === value)?.label ?? value;
}

function taskPersonName(
  person: { name?: string; surname?: string; email?: string } | undefined
): string {
  if (!person) return '';
  return [person.name, person.surname].filter(Boolean).join(' ').trim() || person.email || '';
}

function taskInitials(task: Task): string {
  const assignees = task.assignees ?? [];
  const primary = assignees[0] ?? task.creator;
  const name = taskPersonName(primary);
  if (!name) return 'T';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function taskAvatarSrc(task: Task): string | undefined {
  const assignees = task.assignees ?? [];
  const primary = assignees[0] ?? task.creator;
  return primary?.photoURL ?? primary?.avatar ?? undefined;
}

function clientNamesLine(task: Task): string | null {
  const clients = task.clients ?? [];
  if (clients.length === 0) return null;
  return clients.map((c) => c.name?.trim()).filter(Boolean).join(', ') || null;
}

function taskSummaryLine(task: Task): string {
  const desc = task.description?.trim();
  if (desc) return desc;
  const comment = task.comment?.trim();
  if (comment) return comment;
  return 'Task created';
}

function deadlineBadge(task: Task): ReactNode {
  if (!task.deadline) return null;
  const d = new Date(task.deadline);
  if (Number.isNaN(d.getTime())) return null;
  const overdue = d < new Date() && !isToday(d);
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 gap-1 text-[10px] font-medium',
        overdue
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
          : isToday(d)
            ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-400'
            : 'border-muted-foreground/30 text-muted-foreground'
      )}
    >
      <CalendarClock className="size-3" aria-hidden />
      {isToday(d) ? 'Due today' : format(d, 'MMM d')}
    </Badge>
  );
}

function effectiveTaskSortDate(task: Task): number {
  if (task.deadline) {
    const d = new Date(task.deadline);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  if (task.createdAt) {
    const d = new Date(task.createdAt);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

export interface PlanningInboxViewProps {
  tasks: Task[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectedTaskUid?: number | null;
  onTaskClick?: (task: Task) => void;
}

export function PlanningInboxView({
  tasks,
  isLoading = false,
  emptyMessage = 'No tasks match your filters.',
  selectedTaskUid,
  onTaskClick,
}: PlanningInboxViewProps) {
  const rows = useMemo(() => {
    return [...tasks].sort((a, b) => effectiveTaskSortDate(b) - effectiveTaskSortDate(a));
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="p-1.5" data-tour="planning-inbox">
      <ul className="flex flex-col gap-1.5">
        {rows.map((task, index) => {
          const selected = selectedTaskUid === task.uid;
          const deadline = task.deadline ? new Date(task.deadline) : null;
          const deadlineLabel =
            deadline && !Number.isNaN(deadline.getTime())
              ? isToday(deadline)
                ? formatDistanceToNow(deadline, { addSuffix: true })
                : format(deadline, 'MMM d')
              : null;
          const clients = clientNamesLine(task);
          const imgSrc = taskAvatarSrc(task);
          const isRunning =
            task.jobStatus === 'RUNNING' && task.jobStartTime != null;

          return (
            <li
              key={task.uid}
              className={cn(
                'overflow-hidden rounded-lg border border-border bg-card/50',
                isRunning && 'ring-1 ring-inset ring-red-200/60 dark:ring-red-900/50'
              )}
            >
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors sm:gap-3 sm:px-3',
                  'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  selected && 'bg-violet-50/80 dark:bg-violet-950/30',
                  isRunning && 'bg-red-50/30 dark:bg-red-950/20'
                )}
                onClick={() => onTaskClick?.(task)}
                {...(index === 0 ? { 'data-tour': 'planning-first-task-row' } : {})}
              >
                <Avatar className="size-10 shrink-0 ring-2 ring-background sm:size-11">
                  {imgSrc ? <AvatarImage src={imgSrc} alt="" /> : null}
                  <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800 sm:text-sm dark:bg-violet-900/50 dark:text-violet-200">
                    {taskInitials(task)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {task.title}
                    </span>
                    {deadlineBadge(task)}
                  </div>
                  {clients ? (
                    <p className="truncate text-sm text-muted-foreground">{clients}</p>
                  ) : null}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {optionLabel(TASK_STATUS_OPTIONS, task.status) ? (
                      <span>{optionLabel(TASK_STATUS_OPTIONS, task.status)}</span>
                    ) : null}
                    {optionLabel(TASK_PRIORITY_OPTIONS, task.priority) ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>{optionLabel(TASK_PRIORITY_OPTIONS, task.priority)}</span>
                      </>
                    ) : null}
                    {optionLabel(TASK_TYPE_OPTIONS, task.taskType) ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>{optionLabel(TASK_TYPE_OPTIONS, task.taskType)}</span>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {taskSummaryLine(task)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 self-start">
                  {deadlineLabel ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {deadlineLabel}
                    </span>
                  ) : null}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
