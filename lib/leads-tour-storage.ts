'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface LeadsTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const LEADS_TOUR_KEY_PREFIX = 'loro_leads_tour_v3';

function buildLeadsTourKey(userId: string): string {
  return `${LEADS_TOUR_KEY_PREFIX}:${userId}`;
}

export function readLeadsTourState(userId: string): LeadsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildLeadsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeadsTourState>;
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

export function writeLeadsTourState(userId: string, state: LeadsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildLeadsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
