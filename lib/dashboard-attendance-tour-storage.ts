'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface DashboardAttendanceTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const DASHBOARD_ATTENDANCE_TOUR_KEY_PREFIX = 'loro_dashboard_attendance_tour_v3';

function buildDashboardAttendanceTourKey(userId: string): string {
  return `${DASHBOARD_ATTENDANCE_TOUR_KEY_PREFIX}:${userId}`;
}

export function readDashboardAttendanceTourState(
  userId: string
): DashboardAttendanceTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildDashboardAttendanceTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardAttendanceTourState>;
    if (
      typeof parsed.period !== 'string' ||
      !isYearMonthString(parsed.period) ||
      typeof parsed.resumeIndex !== 'number' ||
      typeof parsed.completedThisMonth !== 'boolean'
    ) {
      return null;
    }
    return {
      period: parsed.period,
      resumeIndex: Math.max(0, Math.floor(parsed.resumeIndex)),
      completedThisMonth: parsed.completedThisMonth,
    };
  } catch {
    return null;
  }
}

export function writeDashboardAttendanceTourState(
  userId: string,
  state: DashboardAttendanceTourState
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildDashboardAttendanceTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
