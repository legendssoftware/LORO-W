'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface PlanningTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const PLANNING_TOUR_KEY_PREFIX = 'loro_planning_tour_v2';

function buildPlanningTourKey(userId: string): string {
  return `${PLANNING_TOUR_KEY_PREFIX}:${userId}`;
}

export function readPlanningTourState(userId: string): PlanningTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildPlanningTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanningTourState>;
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

export function writePlanningTourState(userId: string, state: PlanningTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildPlanningTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
