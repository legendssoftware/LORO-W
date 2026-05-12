'use client';

import { getCurrentYearMonth } from '@/lib/tour-period';

export interface TourMonthState {
  period: string;
  resumeIndex: number;
  completedThisMonth: boolean;
}

/**
 * When the user closes the tour (X / Done), we mark the current calendar month complete so the
 * auto-tour does not run again until `period` rolls over. React effect teardown and other
 * programmatic `destroy()` calls should set `programmaticDestroyRef` first so we only persist
 * resume progress instead of suppressing the tour for the month.
 */
export function persistAfterDriverDestroyed(options: {
  userId: string;
  write: (userId: string, state: TourMonthState) => void;
  boundedStartIndex: number;
  getActiveIndex: () => number | undefined;
  wasCompletedRef: { current: boolean };
  programmaticDestroyRef: { current: boolean };
}): void {
  const periodNow = getCurrentYearMonth();
  const activeIndex = options.getActiveIndex() ?? options.boundedStartIndex;
  options.wasCompletedRef.current = false;

  if (options.programmaticDestroyRef.current) {
    options.write(options.userId, {
      period: periodNow,
      resumeIndex: activeIndex,
      completedThisMonth: false,
    });
    return;
  }

  options.write(options.userId, {
    period: periodNow,
    resumeIndex: 0,
    completedThisMonth: true,
  });
}
