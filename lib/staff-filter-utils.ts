/**
 * Staff attendance status filter options with icons for dropdown display.
 * Aligned with StatusFilter in @/app/reports/types.
 */

import type { ComponentType } from 'react';
import {
  LayoutGrid,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  CalendarOff,
  Building2,
  Home,
  House,
  MapPin,
  Car,
  AlertTriangle,
} from 'lucide-react';
import type { ReportCardUser, StatusFilter } from '@/app/reports/types';
import { OPTION_KEY_TO_LABEL } from '@/lib/clock-in-options';
import { formatEnumLabel } from '@/lib/format-enum-label';

/** Sentinel: no role/branch dimension filter applied. */
export const STAFF_DIMENSION_FILTER_ALL = '__all__';

/** Sentinel: filter to users with no role or no branch string. */
export const STAFF_DIMENSION_FILTER_NONE = '__none__';

/**
 * Build role dropdown options from the current user list (dedupes by case-insensitive key).
 */
export function buildStaffRoleFilterItems(users: ReportCardUser[]): { value: string; label: string }[] {
  const byLower = new Map<string, string>();
  let hasUnassigned = false;
  for (const u of users) {
    const r = u.role?.trim();
    if (!r) {
      hasUnassigned = true;
      continue;
    }
    const k = r.toLowerCase();
    if (!byLower.has(k)) byLower.set(k, r);
  }
  const items: { value: string; label: string }[] = [
    { value: STAFF_DIMENSION_FILTER_ALL, label: 'All roles' },
  ];
  if (hasUnassigned) items.push({ value: STAFF_DIMENSION_FILTER_NONE, label: 'Unassigned' });
  const sorted = [...byLower.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  for (const [low, label] of sorted) {
    items.push({ value: low, label });
  }
  return items;
}

/**
 * Build branch dropdown options from the current user list (dedupes by case-insensitive key).
 */
export function buildStaffBranchFilterItems(users: ReportCardUser[]): { value: string; label: string }[] {
  const byLower = new Map<string, string>();
  let hasUnassigned = false;
  for (const u of users) {
    const b = u.branch?.trim();
    if (!b) {
      hasUnassigned = true;
      continue;
    }
    const k = b.toLowerCase();
    if (!byLower.has(k)) byLower.set(k, b);
  }
  const items: { value: string; label: string }[] = [
    { value: STAFF_DIMENSION_FILTER_ALL, label: 'All branches' },
  ];
  if (hasUnassigned) items.push({ value: STAFF_DIMENSION_FILTER_NONE, label: 'Unassigned' });
  const sorted = [...byLower.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  for (const [low, label] of sorted) {
    items.push({ value: low, label });
  }
  return items;
}

/**
 * Build workforce type filter options from the current user list (dedupe by case-insensitive key).
 */
export function buildStaffWorkforceFilterItems(users: ReportCardUser[]): { value: string; label: string }[] {
  const byLower = new Map<string, string>();
  let hasUnassigned = false;
  for (const u of users) {
    const w = u.workforceType?.trim();
    if (!w) {
      hasUnassigned = true;
      continue;
    }
    const k = w.toLowerCase();
    if (!byLower.has(k)) byLower.set(k, w);
  }
  const items: { value: string; label: string }[] = [
    { value: STAFF_DIMENSION_FILTER_ALL, label: 'All workforce types' },
  ];
  if (hasUnassigned) items.push({ value: STAFF_DIMENSION_FILTER_NONE, label: 'Unassigned' });
  const sorted = [...byLower.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  for (const [low, canonical] of sorted) {
    items.push({ value: low, label: formatEnumLabel(canonical) });
  }
  return items;
}

export function staffUserMatchesRoleFilter(user: ReportCardUser, filter: string): boolean {
  if (filter === STAFF_DIMENSION_FILTER_ALL) return true;
  if (filter === STAFF_DIMENSION_FILTER_NONE) return !user.role?.trim();
  return user.role?.trim().toLowerCase() === filter;
}

export function staffUserMatchesBranchFilter(user: ReportCardUser, filter: string): boolean {
  if (filter === STAFF_DIMENSION_FILTER_ALL) return true;
  if (filter === STAFF_DIMENSION_FILTER_NONE) return !user.branch?.trim();
  return user.branch?.trim().toLowerCase() === filter;
}

export function staffUserMatchesWorkforceFilter(user: ReportCardUser, filter: string): boolean {
  if (filter === STAFF_DIMENSION_FILTER_ALL) return true;
  if (filter === STAFF_DIMENSION_FILTER_NONE) return !user.workforceType?.trim();
  return user.workforceType?.trim().toLowerCase() === filter;
}

type IconComponent = ComponentType<{ className?: string; size?: number }>;

export const STAFF_STATUS_FILTER_OPTIONS: {
  value: StatusFilter;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'present', label: 'Present', icon: UserCheck },
  { value: 'absent', label: 'Absent', icon: UserX },
  { value: 'late', label: 'Late', icon: Clock },
  { value: 'early', label: 'Early', icon: Clock },
  { value: 'behind_on_hours', label: 'Behind on hours', icon: AlertCircle },
  { value: 'idle', label: 'Idle (>7 days in-active)', icon: CalendarOff },
  { value: 'at_office', label: OPTION_KEY_TO_LABEL.at_office, icon: Building2 },
  { value: 'work_from_home', label: OPTION_KEY_TO_LABEL.work_from_home, icon: Home },
  { value: 'starting_from_home', label: OPTION_KEY_TO_LABEL.starting_from_home, icon: House },
  { value: 'offsite', label: OPTION_KEY_TO_LABEL.offsite, icon: MapPin },
  { value: 'driving', label: OPTION_KEY_TO_LABEL.driving, icon: Car },
  { value: 'sales_warning_1', label: 'Sales warning: Level 1', icon: AlertTriangle },
  { value: 'sales_warning_2', label: 'Sales warning: Level 2', icon: AlertTriangle },
  { value: 'sales_warning_3', label: 'Sales warning: Level 3', icon: AlertTriangle },
];
