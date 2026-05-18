/**
 * Helpers for the planning table and detail dialog.
 */

import { format } from 'date-fns';
import type { UserListItem } from '@/api/endpoints/user';
import type { Task } from '@/api/types/tasks';

export const PLANNING_TABLE_LINK_CLASS = 'text-primary underline hover:opacity-80';

export type PlanningColumnWidth = 'default' | 'quarter' | 'double';

export function planningColumnWidthClass(width: PlanningColumnWidth | undefined): string {
  switch (width) {
    case 'quarter':
      return 'min-w-[7rem]';
    case 'double':
      return 'min-w-[24rem]';
    default:
      return 'min-w-[12rem]';
  }
}

/** Format deadline for display. */
export function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return '-';
  try {
    return format(new Date(deadline), 'MMM d, yyyy');
  } catch {
    return '-';
  }
}

/** Format completion date for display. */
export function formatCompletionDate(
  date: string | Date | null | undefined
): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return '-';
  }
}

/** Format creator name for display. */
export function formatCreator(task: Task): string {
  const c = task.creator;
  if (!c) return '-';
  return [c.name, c.surname].filter(Boolean).join(' ').trim() || c.email || '-';
}

/** Format assignees for display. */
export function formatAssignees(task: Task): string {
  const assignees = task.assignees ?? [];
  if (assignees.length === 0) return '-';
  return assignees
    .map((a) => [a.name, a.surname].filter(Boolean).join(' ').trim() || a.email || '-')
    .filter((s) => s !== '-')
    .join(', ') || '-';
}

/** Format clients for display. */
export function formatClients(task: Task): string {
  const clients = task.clients ?? [];
  if (clients.length === 0) return '-';
  return clients.map((c) => c.name || `Client ${c.uid}`).join(', ');
}

/** Format status for display (human-readable). */
export function formatStatus(status: string | undefined): string {
  if (!status) return '-';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable duration from whole minutes (e.g. task job duration). */
export function formatMinutesHuman(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m === 0) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0 && min > 0) return `${h}h ${min}m`;
  if (h > 0) return `${h}h`;
  return `${min}m`;
}

/** Elapsed label since ISO start (for running jobs); optional `now` for tests/ticks. */
export function formatElapsedSinceJobStart(startIso: string, now: number = Date.now()): string {
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return '-';
  const ms = Math.max(0, now - start);
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 1) {
    const sec = Math.max(1, Math.floor(ms / 1000));
    return `${sec}s`;
  }
  return `${formatMinutesHuman(minutes)} (running)`;
}

type AssigneeLike = NonNullable<Task['assignees']>[number];

export function resolveAssigneeProfile(
  assignee: AssigneeLike,
  users: UserListItem[]
): { fullName: string; imageSrc: string | undefined } {
  const fullName =
    [assignee.name, assignee.surname].filter(Boolean).join(' ').trim() ||
    assignee.email ||
    '-';
  let imageSrc: string | undefined =
    (assignee.photoURL ?? assignee.avatar) || undefined;
  if (!imageSrc) {
    const u = users.find(
      (x) =>
        (assignee.uid != null && x.uid === assignee.uid) ||
        (!!assignee.clerkUserId && x.clerkUserId === assignee.clerkUserId)
    );
    imageSrc = (u?.photoURL ?? u?.avatar) || undefined;
  }
  return { fullName, imageSrc };
}

export function resolveCreatorProfile(
  creator: Task['creator'],
  users: UserListItem[]
): { fullName: string; imageSrc: string | undefined } {
  if (!creator) return { fullName: '-', imageSrc: undefined };
  const fullName =
    [creator.name, creator.surname].filter(Boolean).join(' ').trim() ||
    creator.email ||
    '-';
  let imageSrc: string | undefined =
    (creator.photoURL ?? creator.avatar) || undefined;
  if (!imageSrc && creator.uid != null) {
    const u = users.find((x) => x.uid === creator.uid);
    imageSrc = (u?.photoURL ?? u?.avatar) || undefined;
  }
  return { fullName, imageSrc };
}

/** Display string for job duration (running elapsed, completed total, or "-"). */
export function formatJobDurationDisplay(task: Task, nowMs: number = Date.now()): string {
  if (task.jobStatus === 'RUNNING' && task.jobStartTime) {
    return formatElapsedSinceJobStart(task.jobStartTime, nowMs);
  }
  if (task.jobStatus === 'COMPLETED') {
    if (task.jobDuration != null) {
      return formatMinutesHuman(task.jobDuration);
    }
    if (task.jobStartTime && task.jobEndTime) {
      const ms =
        new Date(task.jobEndTime).getTime() - new Date(task.jobStartTime).getTime();
      if (ms > 0) return formatMinutesHuman(ms / (60 * 1000));
    }
  }
  if (task.jobDuration != null) {
    return formatMinutesHuman(task.jobDuration);
  }
  return '-';
}
