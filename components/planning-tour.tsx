'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getCurrentYearMonth,
  readPlanningTourState,
  writePlanningTourState,
} from '@/lib/planning-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const TOUR_INTRO_DESCRIPTION =
  'This is the Planning page: track your tasks, create new work, and manage progress. The next steps walk through the page overview, task actions, filters, and the task table.';

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Planning',
      description: TOUR_INTRO_DESCRIPTION,
    },
  },
  {
    element: '[data-tour="planning-page-header"]',
    popover: {
      title: 'Planning overview',
      description:
        'This header confirms you are in Planning, where tasks can be viewed, tracked, and managed.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="planning-create-button"]',
    popover: {
      title: 'Create tasks quickly',
      description:
        'Use Create task in the page header to add a new task and assign it to the right people.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="planning-tabs"]',
    popover: {
      title: 'All tasks, My day, Routes',
      description:
        'Switch between the full task list, today’s work, and optimized field routes on the map.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="planning-reminders"]',
    popover: {
      title: 'Reminders inbox',
      description:
        'See due today, overdue, and upcoming tasks without waiting for push notifications.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="planning-toolbar"]',
    popover: {
      title: 'Filter and search tasks',
      description:
        'Refine your task list by date range, status, priority, assignee, and search text to focus on exactly what matters.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="planning-task-table"]',
    popover: {
      title: 'Task list',
      description:
        'Review matching tasks as cards. Open a row to inspect details and make updates as work progresses.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="planning-pagination"]',
    popover: {
      title: 'Pagination',
      description:
        'Change rows per page and move between pages when you have many tasks.',
      side: 'top',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'Having issues?',
      description: TOUR_FAQ_DESCRIPTION,
    },
  },
];

function areTourTargetsReady(): boolean {
  return TOUR_STEPS.every((step) => {
    if (typeof step.element !== 'string') return true;
    return document.querySelector(step.element) !== null;
  });
}

export function PlanningTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);
  const programmaticDestroyRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/planning'),
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
    const stored = readPlanningTourState(userId);
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
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          TOUR_STEPS.length - 1
        );

        writePlanningTourState(userId, {
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
          steps: TOUR_STEPS,
          onHighlighted: (_element, _step, { driver: activeDriver }) => {
            const activeIndex = activeDriver.getActiveIndex() ?? 0;
            writePlanningTourState(userId, {
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
              write: writePlanningTourState,
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
