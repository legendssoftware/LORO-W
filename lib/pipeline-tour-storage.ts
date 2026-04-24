'use client';

export interface PipelineTourState {
  date: string;
  resumeIndex: number;
  completedToday: boolean;
}

const PIPELINE_TOUR_KEY_PREFIX = 'loro_pipeline_tour_v1';

function buildPipelineTourKey(userId: string): string {
  return `${PIPELINE_TOUR_KEY_PREFIX}:${userId}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readPipelineTourState(userId: string): PipelineTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildPipelineTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PipelineTourState>;
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

export function writePipelineTourState(userId: string, state: PipelineTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildPipelineTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
