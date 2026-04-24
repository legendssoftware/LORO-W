'use client';

export interface StaffTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const STAFF_TOUR_KEY_PREFIX = 'loro_staff_tour_v1';

function buildStaffTourKey(userId: string): string {
  return `${STAFF_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readStaffTourState(userId: string): StaffTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildStaffTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StaffTourState>;
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

export function writeStaffTourState(userId: string, state: StaffTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildStaffTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
