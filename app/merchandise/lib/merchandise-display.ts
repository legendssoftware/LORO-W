import {
  compareDesc,
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isThisMonth,
  isThisWeek,
  isToday,
  parseISO,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { Journal } from '@/api/types/journal';

export const MERCHANDISE_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

const LOCKED_STATUSES = new Set(['PUBLISHED', 'ARCHIVED']);

/** Human label for a journal status enum value. */
export function merchandiseStatusLabel(status: string | null | undefined): string {
  const match = MERCHANDISE_STATUS_OPTIONS.find((option) => option.value === status);
  if (match) return match.label;
  if (!status) return 'Pending review';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Badge tone for a merchandise status. */
export function merchandiseStatusTone(
  status: string | null | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'PUBLISHED') return 'default';
  if (status === 'REJECTED') return 'destructive';
  if (status === 'PENDING_REVIEW' || !status) return 'secondary';
  return 'outline';
}

/** True when the log can still be edited. Published and archived rows stay locked. */
export function isMerchandiseEditable(status: string | null | undefined): boolean {
  return !LOCKED_STATUSES.has((status ?? '').toUpperCase());
}

/** Owner display name, falling back to username. */
export function merchandiseOwnerName(journal: Journal): string {
  const name = `${journal.owner?.name ?? ''} ${journal.owner?.surname ?? ''}`.trim();
  if (name) return name;
  return journal.owner?.username || journal.owner?.email || 'Unknown user';
}

/** Relative created time, or an em dash when the date is missing. */
export function merchandiseCreatedLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return '—';
  const date = parseISO(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Calendar date for a merchandise timestamp. */
export function merchandiseDateLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM dd, yyyy');
}

export interface MerchandiseSection {
  title: string;
  data: Journal[];
}

/**
 * Groups logs the same way the mobile merchandise list does:
 * today, this week, last week, this month, last month, then older.
 */
export function groupMerchandiseByDate(journals: Journal[]): MerchandiseSection[] {
  const today: Journal[] = [];
  const thisWeek: Journal[] = [];
  const lastWeek: Journal[] = [];
  const thisMonth: Journal[] = [];
  const lastMonth: Journal[] = [];
  const older: Journal[] = [];

  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const twoWeeksAgo = subWeeks(now, 2);
  const oneMonthAgo = subMonths(now, 1);
  const twoMonthsAgo = subMonths(now, 2);

  for (const journal of journals) {
    const created = parseISO(journal.createdAt);
    if (Number.isNaN(created.getTime())) {
      older.push(journal);
      continue;
    }
    if (isToday(created)) today.push(journal);
    else if (isThisWeek(created)) thisWeek.push(journal);
    else if (isAfter(created, twoWeeksAgo) && isBefore(created, oneWeekAgo)) lastWeek.push(journal);
    else if (isThisMonth(created)) thisMonth.push(journal);
    else if (isAfter(created, twoMonthsAgo) && isBefore(created, oneMonthAgo)) lastMonth.push(journal);
    else older.push(journal);
  }

  const byNewest = (a: Journal, b: Journal) =>
    compareDesc(parseISO(a.createdAt), parseISO(b.createdAt));
  today.sort(byNewest);
  thisWeek.sort(byNewest);
  lastWeek.sort(byNewest);
  thisMonth.sort(byNewest);
  lastMonth.sort(byNewest);
  older.sort(byNewest);

  const sections: MerchandiseSection[] = [];
  if (today.length > 0) sections.push({ title: 'Today', data: today });
  if (thisWeek.length > 0) sections.push({ title: 'This week', data: thisWeek });
  if (lastWeek.length > 0) sections.push({ title: 'Last week', data: lastWeek });
  if (thisMonth.length > 0) sections.push({ title: 'This month', data: thisMonth });
  if (lastMonth.length > 0) sections.push({ title: 'Last month', data: lastMonth });
  if (older.length > 0) sections.push({ title: 'Older', data: older });
  return sections;
}

/** Street and city lines for a branch address. */
export function merchandiseAddressLines(journal: Journal): string[] {
  const address = journal.branch?.address;
  if (!address) return [];
  const street = [address.street, address.suburb].filter(Boolean).join(', ');
  const city = [address.city, address.state, address.country].filter(Boolean).join(', ');
  return [street, city].filter(Boolean);
}
