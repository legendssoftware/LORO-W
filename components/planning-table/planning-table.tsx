'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { Task } from '@/api/types/tasks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2Icon } from '@/lib/icons';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
} from '@/lib/task-form-utils';
import { TaskDetailDialog } from './task-detail-dialog';
import {
  formatDeadline,
  formatClients,
  formatCompletionDate,
  formatStatus,
  planningColumnWidthClass,
  type PlanningColumnWidth,
} from './planning-table-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PlanningDisplayColumn {
  key: string;
  label: string;
  render: (t: Task) => ReactNode;
  width?: PlanningColumnWidth;
}

const PLANNING_DISPLAY_COLUMNS: PlanningDisplayColumn[] = [
  {
    key: 'title',
    label: 'Title',
    render: (t) => (
      <span className="font-medium">{t.title}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 'quarter',
    render: (t) => {
      const opt = TASK_STATUS_OPTIONS.find((o) => o.value === t.status);
      const Icon = opt?.icon;
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
            t.status === 'COMPLETED' && 'bg-green-100 text-green-800',
            t.status === 'IN_PROGRESS' && 'bg-blue-100 text-blue-800',
            t.status === 'OVERDUE' && 'bg-red-100 text-red-800',
            t.status === 'PENDING' && 'bg-gray-100 text-gray-800',
            !['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'PENDING'].includes(t.status ?? '') && 'bg-gray-100 text-gray-800'
          )}
        >
          {Icon && <Icon className="size-3 shrink-0" />}
          {formatStatus(t.status)}
        </span>
      );
    },
  },
  {
    key: 'priority',
    label: 'Priority',
    width: 'quarter',
    render: (t) => {
      const opt = TASK_PRIORITY_OPTIONS.find((o) => o.value === t.priority);
      const Icon = opt?.icon;
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
            t.priority === 'URGENT' && 'bg-red-100 text-red-800',
            t.priority === 'HIGH' && 'bg-amber-100 text-amber-800',
            t.priority === 'MEDIUM' && 'bg-gray-100 text-gray-800',
            t.priority === 'LOW' && 'bg-green-100 text-green-800'
          )}
        >
          {Icon && <Icon className="size-3 shrink-0" />}
          {formatStatus(t.priority)}
        </span>
      );
    },
  },
  {
    key: 'deadline',
    label: 'Deadline',
    width: 'quarter',
    render: (t) => formatDeadline(t.deadline),
  },
  {
    key: 'type',
    label: 'Type',
    width: 'quarter',
    render: (t) => {
      const opt = TASK_TYPE_OPTIONS.find((o) => o.value === t.taskType);
      const Icon = opt?.icon;
      return (
        <span className="inline-flex items-center gap-1.5">
          {Icon && <Icon className="size-3 shrink-0 text-muted-foreground" />}
          {formatStatus(t.taskType)}
        </span>
      );
    },
  },
  {
    key: 'creator',
    label: 'Creator',
    width: 'quarter',
    render: (t) => {
      const c = t.creator;
      if (!c) return '-';
      const fullName =
        [c.name, c.surname].filter(Boolean).join(' ').trim() ||
        c.email ||
        '-';
      const imgSrc = c.photoURL ?? c.avatar ?? undefined;
      return (
        <span className="flex items-center gap-2">
          <Avatar className="size-6 shrink-0">
            <AvatarImage src={imgSrc} alt={fullName} />
            <AvatarFallback className="text-xs">
              {fullName !== '-' ? fullName.slice(0, 2).toUpperCase() : '-'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{fullName}</span>
        </span>
      );
    },
  },
  {
    key: 'assignees',
    label: 'Assignees',
    render: (t) => {
      const assignees = t.assignees ?? [];
      if (assignees.length === 0) return '-';
      const first = assignees[0];
      const fullName =
        [first.name, first.surname].filter(Boolean).join(' ').trim() ||
        first.email ||
        '-';
      const imgSrc = first.photoURL ?? first.avatar ?? undefined;
      const displayText =
        assignees.length === 1
          ? fullName
          : `${fullName} and ${assignees.length - 1} more`;
      return (
        <span className="flex items-center gap-2">
          <Avatar className="size-6 shrink-0">
            <AvatarImage src={imgSrc} alt={fullName} />
            <AvatarFallback className="text-xs">
              {fullName !== '-' ? fullName.slice(0, 2).toUpperCase() : '-'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{displayText}</span>
        </span>
      );
    },
  },
  {
    key: 'clients',
    label: 'Clients',
    render: (t) => formatClients(t),
  },
  {
    key: 'progress',
    label: 'Progress',
    width: 'quarter',
    render: (t) => `${t.progress ?? 0}%`,
  },
  {
    key: 'completionDate',
    label: 'Completion',
    width: 'quarter',
    render: (t) => formatCompletionDate(t.completionDate),
  },
  {
    key: 'createdAt',
    label: 'Created',
    width: 'quarter',
    render: (t) =>
      t.createdAt ? format(new Date(t.createdAt), 'MMM d, yyyy') : '-',
  },
];

export interface PlanningTableProps {
  tasks: Task[];
  isLoading?: boolean;
  emptyMessage?: string;
  onTaskUpdated?: () => void;
  /** When set, row clicks delegate here instead of opening the built-in detail dialog. */
  onTaskClick?: (task: Task) => void;
}

export function PlanningTable({
  tasks,
  isLoading = false,
  emptyMessage = 'No tasks yet. Create a task to see it here.',
  onTaskUpdated,
  onTaskClick,
}: PlanningTableProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [tasks]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="rounded border overflow-x-auto bg-white">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              {PLANNING_DISPLAY_COLUMNS.map((col) => (
                <TableHead key={col.key} className={cn('whitespace-nowrap', planningColumnWidthClass(col.width))}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr:nth-child(odd)]:bg-gray-50">
            {sortedTasks.map((t) => (
              <TableRow
                key={t.uid}
                className={cn(
                  'cursor-pointer hover:bg-muted/50 transition-colors border-b-0',
                  t.jobStatus === 'RUNNING' && t.jobStartTime &&
                    'ring-1 ring-inset ring-red-200/60 bg-red-50/30'
                )}
                onClick={() => {
                  if (onTaskClick) {
                    onTaskClick(t);
                    return;
                  }
                  setSelectedTask(t);
                  setDetailOpen(true);
                }}
              >
                {PLANNING_DISPLAY_COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn('text-sm whitespace-normal align-top min-w-0', planningColumnWidthClass(col.width))}
                  >
                    {col.render(t)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!onTaskClick && (
        <TaskDetailDialog
          task={selectedTask}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelectedTask(null);
          }}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </>
  );
}
