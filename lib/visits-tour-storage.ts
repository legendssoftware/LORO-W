'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface VisitsTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const VISITS_TOUR_KEY_PREFIX = 'loro_visits_tour_v2';

function buildVisitsTourKey(userId: string): string {
  return `${VISITS_TOUR_KEY_PREFIX}:${userId}`;
}

export function readVisitsTourState(userId: string): VisitsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildVisitsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitsTourState>;
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

export function writeVisitsTourState(userId: string, state: VisitsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildVisitsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
