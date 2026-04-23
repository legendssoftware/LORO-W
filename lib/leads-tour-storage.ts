'use client';

export interface LeadsTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const LEADS_TOUR_KEY_PREFIX = 'loro_leads_tour_v2';

function buildLeadsTourKey(userId: string): string {
  return `${LEADS_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readLeadsTourState(userId: string): LeadsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildLeadsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeadsTourState>;
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

export function writeLeadsTourState(userId: string, state: LeadsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildLeadsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
