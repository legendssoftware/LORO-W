'use client';

export interface PlanningTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const PLANNING_TOUR_KEY_PREFIX = 'loro_planning_tour_v1';

function buildPlanningTourKey(userId: string): string {
  return `${PLANNING_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readPlanningTourState(userId: string): PlanningTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildPlanningTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanningTourState>;
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

export function writePlanningTourState(userId: string, state: PlanningTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildPlanningTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
