'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface SettingsTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const SETTINGS_TOUR_KEY_PREFIX = 'loro_settings_tour_v2';

function buildSettingsTourKey(userId: string): string {
  return `${SETTINGS_TOUR_KEY_PREFIX}:${userId}`;
}

export function readSettingsTourState(userId: string): SettingsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildSettingsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SettingsTourState>;
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

export function writeSettingsTourState(userId: string, state: SettingsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildSettingsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
