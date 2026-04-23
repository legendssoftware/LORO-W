'use client';

export interface VisitsTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const VISITS_TOUR_KEY_PREFIX = 'loro_visits_tour_v1';

function buildVisitsTourKey(userId: string): string {
  return `${VISITS_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readVisitsTourState(userId: string): VisitsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildVisitsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitsTourState>;
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

export function writeVisitsTourState(userId: string, state: VisitsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildVisitsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
