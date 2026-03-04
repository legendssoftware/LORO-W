/**
 * Helpers for the planning table and detail dialog.
 */

import { format } from 'date-fns';
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
