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
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_ATTENDANCE = '[data-tour="attendance-button"]';
const SEL_VARIABLE_REM = '[data-tour="variable-rem-section"]';
const SEL_BONUS = '[data-tour="year-end-bonus-section"]';
const SEL_SECTION = '[data-tour="attendance-section"]';
const SEL_MONTH = '[data-tour="attendance-month-selector"]';
const SEL_LOGS = '[data-tour="attendance-logs-button"]';
const SEL_LIST = '[data-tour="monthly-attendance-list"]';

const REQUIRED_SELECTORS = [SEL_ATTENDANCE, SEL_SECTION, SEL_MONTH, SEL_LOGS, SEL_LIST] as const;

const TOUR_INTRO_DESCRIPTION =
  'This is your Home dashboard: start and end your shift, review attendance, and see variable pay when it applies to you. The next steps walk through each part that is on screen.';

function buildDashboardSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to your dashboard',
        description: TOUR_INTRO_DESCRIPTION,
      },
    },
    {
      element: SEL_ATTENDANCE,
      popover: {
        title: 'Attendance actions',
        description:
          'Start your shift, take breaks, and end your shift here. Clock-in asks how you are working, such as office or work from home. After you clock in or out, Pulse may ask for a short check-in. This tour does not open Pulse.',
        side: 'bottom',
        align: 'center',
      },
    },
  ];

  if (document.querySelector(SEL_VARIABLE_REM)) {
    steps.push({
      element: SEL_VARIABLE_REM,
      popover: {
        title: 'Variable remuneration',
        description:
          'Live extra pay on top of commission for this month: which gates are open, progress toward the maximum, and what is still available.',
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
        description: 'Year-end bonus status for the current cycle, when your profile includes it.',
        side: 'top',
        align: 'center',
      },
    });
  }

  steps.push(
    {
      element: SEL_SECTION,
      popover: {
        title: 'Attendance section',
        description: 'Review your monthly attendance card, legend, and quick actions in one place.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_MONTH,
      popover: {
        title: 'Change month',
        description:
          'Use this menu to pick a recent month and view your attendance for past months (up to the last three months).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_LOGS,
      popover: {
        title: 'View logs',
        description: 'Open your attendance logs for detailed daily records.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LIST,
      popover: {
        title: 'Monthly attendance list',
        description: 'This monthly view shows attended, missed, and future days.',
        side: 'top',
        align: 'center',
      },
    },
    {
      popover: {
        title: 'Having issues?',
        description: TOUR_FAQ_DESCRIPTION,
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
