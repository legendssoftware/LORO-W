'use client';

import { useEffect, useRef } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getCurrentYearMonth } from '@/lib/tour-period';
import {
  persistAfterDriverDestroyed,
  type TourMonthState,
} from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

export interface MonthlyPageTourOptions {
  enabled: boolean;
  userId: string | null | undefined;
  read: (userId: string) => TourMonthState | null;
  write: (userId: string, state: TourMonthState) => void;
  areTargetsReady: () => boolean;
  getSteps: () => DriveStep[];
  /** Runs when a step is shown. Use it to open a tab before the anchor exists. */
  onHighlight?: (stepElement: string, activeDriver: Driver) => void;
  /** How many 250ms polls to wait for anchors. Default is 40 (about 10s). */
  maxPollCount?: number;
}

function activeStepElement(activeDriver: Driver): string {
  const step = activeDriver.getActiveStep();
  return typeof step?.element === 'string' ? step.element : '';
}

/**
 * Starts a monthly driver.js tour once `enabled` and the DOM anchors are ready.
 * Close or Done marks the month complete. Leaving the page only saves the resume index.
 */
export function useMonthlyPageTour({
  enabled,
  userId,
  read,
  write,
  areTargetsReady,
  getSteps,
  onHighlight,
  maxPollCount,
}: MonthlyPageTourOptions): void {
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);
  const programmaticDestroyRef = useRef(false);
  const onHighlightRef = useRef(onHighlight);
  const areTargetsReadyRef = useRef(areTargetsReady);
  const getStepsRef = useRef(getSteps);
  const readRef = useRef(read);
  const writeRef = useRef(write);
  const maxPollCountRef = useRef(maxPollCount);
  maxPollCountRef.current = maxPollCount;
  onHighlightRef.current = onHighlight;
  areTargetsReadyRef.current = areTargetsReady;
  getStepsRef.current = getSteps;
  readRef.current = read;
  writeRef.current = write;

  useEffect(() => {
    if (!enabled || !userId) {
      hasAttemptedStartRef.current = false;
      wasCompletedRef.current = false;
      programmaticDestroyRef.current = true;
      try {
        driverRef.current?.destroy();
      } finally {
        programmaticDestroyRef.current = false;
      }
      driverRef.current = null;
      return;
    }
    if (hasAttemptedStartRef.current) return;
    hasAttemptedStartRef.current = true;

    const period = getCurrentYearMonth();
    const stored = readRef.current(userId);
    const currentState = stored ?? {
      period,
      resumeIndex: 0,
      completedThisMonth: false,
    };

    if (currentState.period !== period) {
      currentState.period = period;
      currentState.resumeIndex = 0;
      currentState.completedThisMonth = false;
    }

    if (currentState.completedThisMonth) return;

    const cancelSchedule = scheduleTourWhenReady({
      areTargetsReady: () => areTargetsReadyRef.current(),
      maxPollCount: maxPollCountRef.current,
      onReady: () => {
        const steps = getStepsRef.current();
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          Math.max(0, steps.length - 1)
        );

        writeRef.current(userId, {
          period,
          resumeIndex: boundedStartIndex,
          completedThisMonth: false,
        });

        const driverObj = driver({
          showProgress: true,
          smoothScroll: true,
          allowClose: true,
          popoverClass: DRIVER_TOUR_POPOVER_CLASS,
          nextBtnText: 'Next',
          prevBtnText: 'Previous',
          doneBtnText: 'Done',
          steps,
          onHighlighted: (_element, _step, { driver: activeDriver }) => {
            const stepElement = activeStepElement(activeDriver);
            onHighlightRef.current?.(stepElement, activeDriver);
            const activeIndex = activeDriver.getActiveIndex() ?? 0;
            writeRef.current(userId, {
              period: getCurrentYearMonth(),
              resumeIndex: activeIndex,
              completedThisMonth: false,
            });
          },
          onNextClick: (_element, _step, { driver: activeDriver }) => {
            if (activeDriver.isLastStep()) {
              wasCompletedRef.current = true;
              activeDriver.destroy();
              return;
            }
            activeDriver.moveNext();
          },
          onPrevClick: (_element, _step, { driver: activeDriver }) => {
            activeDriver.movePrevious();
          },
          onCloseClick: (_element, _step, { driver: activeDriver }) => {
            activeDriver.destroy();
          },
          onDestroyed: (_element, _step, { driver: activeDriver }) => {
            persistAfterDriverDestroyed({
              userId,
              write: writeRef.current,
              boundedStartIndex,
              getActiveIndex: () => activeDriver.getActiveIndex(),
              wasCompletedRef,
              programmaticDestroyRef,
            });
          },
        });

        driverRef.current = driverObj;
        driverObj.drive(boundedStartIndex);
      },
    });

    return () => {
      cancelSchedule();
      programmaticDestroyRef.current = true;
      try {
        driverRef.current?.destroy();
      } finally {
        programmaticDestroyRef.current = false;
      }
      driverRef.current = null;
      wasCompletedRef.current = false;
    };
  }, [enabled, userId]);
}
