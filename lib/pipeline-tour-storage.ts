'use client';

import { isYearMonthString } from '@/lib/tour-period';

export { getCurrentYearMonth } from '@/lib/tour-period';

export interface PipelineTourState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

const PIPELINE_TOUR_KEY_PREFIX = 'loro_pipeline_tour_v2';

function buildPipelineTourKey(userId: string): string {
  return `${PIPELINE_TOUR_KEY_PREFIX}:${userId}`;
}

export function readPipelineTourState(userId: string): PipelineTourState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildPipelineTourKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PipelineTourState>;
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

export function writePipelineTourState(userId: string, state: PipelineTourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(buildPipelineTourKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota/private mode
  }
}
