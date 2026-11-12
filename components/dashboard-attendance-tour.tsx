'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getCurrentYearMonth,
  readDashboardAttendanceTourState,
  writeDashboardAttendanceTourState,
} from '@/lib/dashboard-attendance-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_ATTENDANCE = '[data-tour="attendance-button"]';
const SEL_VARIABLE_REM = '[data-tour="variable-rem-section"]';
const SEL_BONUS = '[data-tour="year-end-bonus-section"]';
const SEL_SECTION = '[data-tour="attendance-section"]';
const SEL_MONTH = '[data-tour="attendance-month-selector"]';
const SEL_LOGS = '[data-tour="attendance-logs-button"]';
const SEL_LIST = '[data-tour="monthly-attendance-list"]';

const REQUIRED_SELECTORS = [SEL_ATTENDANCE, SEL_SECTION, SEL_MONTH, SEL_LOGS, SEL_LIST] as const;

function buildDashboardSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_ATTENDANCE,
      popover: {
        title: 'Clock in and out',
        description:
          'Click here to start your shift, take a break, or end it. Clock-in asks office or work from home. Pulse may ask a short check-in after you clock in or out.',
        side: 'bottom',
        align: 'center',
      },
    },
  ];

  if (document.querySelector(SEL_VARIABLE_REM)) {
    steps.push({
      element: SEL_VARIABLE_REM,
      popover: {
        title: 'Variable pay',
        description:
          'Extra pay on top of commission this month. It shows which gates are open, how close you are to the maximum, and what is still left.',
        side: 'top',
        align: 'center',
      },
    });
  }

  if (document.querySelector(SEL_BONUS)) {
    steps.push({
      element: SEL_BONUS,
      popover: {
        title: 'Year-end bonus',
        description: 'Your year-end bonus status for the current cycle.',
        side: 'top',
        align: 'center',
      },
    });
  }

  steps.push(
    {
      element: SEL_MONTH,
      popover: {
        title: 'Change month',
        description: 'Open this menu to switch among the last three months.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_LOGS,
      popover: {
        title: 'View logs',
        description: 'Click View logs for the day-by-day attendance record.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LIST,
      popover: {
        title: 'This month',
        description: 'Each day is marked attended, missed, or still ahead.',
        side: 'top',
        align: 'center',
      },
    }
  );

  return steps;
}

function areTourTargetsReady(): boolean {
  return REQUIRED_SELECTORS.every((selector) => document.querySelector(selector) !== null);
}

export function DashboardAttendanceTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);
  const programmaticDestroyRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/dashboard'),
    [isLoaded, isSignedIn, userId, pathname]
  );

  useEffect(() => {
    if (!shouldRun || !userId) {
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
    if (blockTours) {
      hasAttemptedStartRef.current = false;
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
    const stored = readDashboardAttendanceTourState(userId);
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
      areTargetsReady: areTourTargetsReady,
      onReady: () => {
        const steps = buildDashboardSteps();
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          steps.length - 1
        );

        writeDashboardAttendanceTourState(userId, {
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
            const activeIndex = activeDriver.getActiveIndex() ?? 0;
            writeDashboardAttendanceTourState(userId, {
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
              write: writeDashboardAttendanceTourState,
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
  }, [shouldRun, userId, blockTours]);

  return null;
}
