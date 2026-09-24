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
import { ROUTE_PLANNING_NOTE, ROUTE_PLANNING_NOTE_TITLE } from '@/lib/route-planning-note';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_HEADER = '[data-tour="planning-page-header"]';
const SEL_CREATE = '[data-tour="planning-create-button"]';
const SEL_TABS = '[data-tour="planning-tabs"]';
const SEL_ROUTE_NOTE = '[data-tour="planning-route-note"]';
const SEL_REMINDERS = '[data-tour="planning-reminders"]';
const SEL_TOOLBAR = '[data-tour="planning-toolbar"]';
const SEL_TABLE = '[data-tour="planning-task-table"]';
const SEL_PAGINATION = '[data-tour="planning-pagination"]';
const SEL_ROUTES = '[data-tour="planning-routes"]';
const SEL_TAB_ALL = '[data-tour="planning-tab-all"]';
const SEL_TAB_ROUTES = '[data-tour="planning-tab-routes"]';

/** Always on the page, including My day and Routes. */
const REQUIRED_SELECTORS = [SEL_HEADER, SEL_CREATE, SEL_TABS, SEL_ROUTE_NOTE] as const;

const ALL_TASKS_SELECTORS = new Set<string>([
  SEL_REMINDERS,
  SEL_TOOLBAR,
  SEL_TABLE,
  SEL_PAGINATION,
]);

const TOUR_INTRO_DESCRIPTION =
  'This is the Planning page: track tasks, create work, and open the day’s routes. The next steps walk through the overview, All tasks, and Routes.';

function clickPlanningTab(selector: string): void {
  const tab = document.querySelector(selector);
  if (tab instanceof HTMLElement) tab.click();
}

function activeStepElement(activeDriver: Driver): string {
  const step = activeDriver.getActiveStep();
  return typeof step?.element === 'string' ? step.element : '';
}

function revealStepTarget(stepElement: string): void {
  if (!stepElement || document.querySelector(stepElement)) return;
  if (stepElement === SEL_ROUTES) {
    clickPlanningTab(SEL_TAB_ROUTES);
    return;
  }
  if (ALL_TASKS_SELECTORS.has(stepElement)) clickPlanningTab(SEL_TAB_ALL);
}

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Planning',
      description: TOUR_INTRO_DESCRIPTION,
    },
  },
  {
    element: SEL_HEADER,
    popover: {
      title: 'Planning overview',
      description:
        'This header confirms you are in Planning, where tasks can be viewed, tracked, and managed.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: SEL_CREATE,
    popover: {
      title: 'Create tasks quickly',
      description:
        'Use Create task in the page header to add a new task and assign it to the right people.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: SEL_TABS,
    popover: {
      title: 'All tasks, My day, Routes',
      description:
        'All tasks is the full list. My day is work due today. Routes is the planned field day: pick the date, recalculate, or open Competitor Overview.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: SEL_ROUTE_NOTE,
    popover: {
      title: ROUTE_PLANNING_NOTE_TITLE,
      description: ROUTE_PLANNING_NOTE,
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: SEL_REMINDERS,
    popover: {
      title: 'Reminders inbox',
      description:
        'On All tasks, see due today, overdue, and upcoming tasks without waiting for push notifications.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: SEL_TOOLBAR,
    popover: {
      title: 'Filter and search tasks',
      description:
        'On All tasks, refine the list by date, status, priority, assignee, client, branch, overdue only, and search text.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: SEL_TABLE,
    popover: {
      title: 'Task list',
      description:
        'Review matching tasks as cards. Open a row to inspect details and make updates as work progresses.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: SEL_PAGINATION,
    popover: {
      title: 'Pagination',
      description: 'Change rows per page and move between pages when you have many tasks.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: SEL_ROUTES,
    popover: {
      title: 'Routes',
      description:
        'Pick the day the visits were planned, recalculate routes, and open Competitor Overview when you need the map.',
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
  return REQUIRED_SELECTORS.every((selector) => document.querySelector(selector) !== null);
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
            const stepElement = activeStepElement(activeDriver);
            if (stepElement && !document.querySelector(stepElement)) {
              revealStepTarget(stepElement);
              window.setTimeout(() => {
                activeDriver.refresh();
              }, 280);
            }
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
