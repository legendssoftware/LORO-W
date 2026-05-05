'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface StaffTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const STAFF_TOUR_KEY_PREFIX = 'loro_staff_tour_v2';

function buildStaffTourKey(userId: string): string {
  return `${STAFF_TOUR_KEY_PREFIX}:${userId}`;
}

export function readStaffTourState(userId: string): StaffTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildStaffTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StaffTourState>;
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

export function writeStaffTourState(userId: string, state: StaffTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildStaffTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
