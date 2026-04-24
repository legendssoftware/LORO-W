'use client';

export interface SettingsTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const SETTINGS_TOUR_KEY_PREFIX = 'loro_settings_tour_v1';

function buildSettingsTourKey(userId: string): string {
  return `${SETTINGS_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readSettingsTourState(userId: string): SettingsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildSettingsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SettingsTourState>;
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

export function writeSettingsTourState(userId: string, state: SettingsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildSettingsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
