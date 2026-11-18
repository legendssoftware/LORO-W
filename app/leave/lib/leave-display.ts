import { format } from 'date-fns';
import type { LeaveRecord } from '@/api/types/leave';
import { LEAVE_STATUS_OPTIONS, LEAVE_TYPE_OPTIONS } from '@/api/types/leave';

const CANCELLABLE_STATUSES = new Set(['PENDING', 'APPROVED']);

export interface LeaveViewer {
  uid?: number | null;
  clerkUserId?: string | null;
}

/** Weekday count between two YYYY-MM-DD dates, minus 0.5 when the request is a half day. */
export function countWeekdayLeaveDuration(
  startYmd: string,
  endYmd: string,
  isHalfDay: boolean
): number | null {
  const start = dateFromYmd(startYmd);
  const end = dateFromYmd(endYmd);
  if (!start || !end || end < start) return null;

  let duration = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) duration += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (isHalfDay) duration -= 0.5;
  return duration;
}

/** True when the request overlaps the inclusive YYYY-MM-DD window. Blank ends are open. */
export function leaveOverlapsRange(
  leave: Pick<LeaveRecord, 'startDate' | 'endDate'>,
  from: string,
  to: string
): boolean {
  const start = ymd(leave.startDate);
  const end = ymd(leave.endDate);
  if (!start || !end) return true;
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
}

/** True when this request belongs to the signed-in user. */
export function isOwnLeaveRequest(leave: LeaveRecord, viewer: LeaveViewer): boolean {
  const clerk = viewer.clerkUserId?.trim();
  if (clerk && leave.ownerClerkUserId?.trim() === clerk) return true;
  if (clerk && leave.owner?.clerkUserId?.trim() === clerk) return true;
  if (viewer.uid != null && leave.owner?.uid === viewer.uid) return true;
  return false;
}

/**
 * Pending and approved requests can be cancelled.
 * A standard user may cancel only their own. HR, admin, manager, and owner may cancel any they can see.
 */
export function canCancelLeaveRequest(input: {
  leave: LeaveRecord;
  viewer: LeaveViewer;
  canDecide: boolean;
}): boolean {
  if (!CANCELLABLE_STATUSES.has(input.leave.status?.toUpperCase())) return false;
  if (input.canDecide) return true;
  return isOwnLeaveRequest(input.leave, input.viewer);
}

export function formatLeaveType(value?: string | null): string {
  const code = String(value ?? '').toUpperCase();
  return LEAVE_TYPE_OPTIONS.find((option) => option.value === code)?.label ?? titleCase(value);
}

export function formatLeaveStatus(value?: string | null): string {
  const code = String(value ?? '').toUpperCase();
  return LEAVE_STATUS_OPTIONS.find((option) => option.value === code)?.label ?? titleCase(value);
}

export function leaveStatusClassName(status?: string | null): string {
  const value = String(status ?? '').toUpperCase();
  if (value === 'APPROVED' || value === 'TAKEN') return 'border-transparent bg-emerald-600 text-white';
  if (value === 'PENDING' || value === 'PARTIALLY_TAKEN') return 'border-transparent bg-blue-100 text-blue-700';
  if (value === 'REJECTED') return 'border-transparent bg-red-600 text-white';
  return 'border-border bg-secondary text-secondary-foreground';
}

export function formatLeaveDate(value?: string | null): string {
  const day = ymd(value);
  if (!day) return '—';
  const parsed = dateFromYmd(day);
  if (!parsed) return day;
  return format(parsed, 'd MMM yyyy');
}

export function formatLeaveDuration(duration?: number | null, isHalfDay?: boolean): string {
  if (duration == null || Number.isNaN(Number(duration))) {
    return isHalfDay ? 'Half day' : '—';
  }
  const amount = Number(duration);
  const label = amount === 1 ? 'day' : 'days';
  return `${amount} ${label}`;
}

export function leavePersonName(person?: LeaveRecord['owner']): string {
  const name = `${person?.name ?? ''} ${person?.surname ?? ''}`.trim();
  return name || person?.email || '—';
}

export function leaveRowsFromList(response: {
  data?: LeaveRecord[] | unknown;
  leaves?: LeaveRecord[];
}): LeaveRecord[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.leaves)) return response.leaves;
  return [];
}

export function ymd(value?: string | null): string {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match?.[1] ?? '';
}

function dateFromYmd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function titleCase(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!text) return '—';
  return text
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
