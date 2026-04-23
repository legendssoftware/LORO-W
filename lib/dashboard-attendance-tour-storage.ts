'use client';

export interface DashboardAttendanceTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const DASHBOARD_ATTENDANCE_TOUR_KEY_PREFIX = 'loro_dashboard_attendance_tour_v1';

function buildDashboardAttendanceTourKey(userId: string): string {
  return `${DASHBOARD_ATTENDANCE_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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
      typeof parsed.date !== 'string' ||
      typeof parsed.resumeIndex !== 'number' ||
      typeof parsed.completedToday !== 'boolean'
    ) {
      return null;
    }
    return {
      date: parsed.date,
      resumeIndex: Math.max(0, Math.floor(parsed.resumeIndex)),
      completedToday: parsed.completedToday,
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
