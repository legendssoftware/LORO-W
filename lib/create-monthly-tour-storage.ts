'use client';

import { isYearMonthString } from '@/lib/tour-period';
import type { TourMonthState } from '@/lib/tour-monthly-persist';

/**
 * localStorage reader/writer for one monthly driver.js tour.
 * Bump `prefix` when step copy changes so a completed month does not hide the new walkthrough.
 */
export function createMonthlyTourStorage(prefix: string): {
  read: (userId: string) => TourMonthState | null;
  write: (userId: string, state: TourMonthState) => void;
} {
  function storageKey(userId: string): string {
    return `${prefix}:${userId}`;
  }

  function read(userId: string): TourMonthState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<TourMonthState>;
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

  function write(userId: string, state: TourMonthState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(state));
    } catch {
      // ignore storage quota/private mode
    }
  }

  return { read, write };
}
