'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface ClientsTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const CLIENTS_TOUR_KEY_PREFIX = 'loro_clients_tour_v2';

function buildClientsTourKey(userId: string): string {
  return `${CLIENTS_TOUR_KEY_PREFIX}:${userId}`;
}

export function readClientsTourState(userId: string): ClientsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildClientsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientsTourState>;
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

export function writeClientsTourState(userId: string, state: ClientsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildClientsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
