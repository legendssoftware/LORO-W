'use client';

export interface ClientsTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const CLIENTS_TOUR_KEY_PREFIX = 'loro_clients_tour_v1';

function buildClientsTourKey(userId: string): string {
  return `${CLIENTS_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readClientsTourState(userId: string): ClientsTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildClientsTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientsTourState>;
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

export function writeClientsTourState(userId: string, state: ClientsTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildClientsTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
