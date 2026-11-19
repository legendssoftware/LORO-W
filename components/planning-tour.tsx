'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

function buildTourSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.planning.header.title'),
        description: t('tours.planning.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_CREATE,
      popover: {
        title: t('tours.planning.create.title'),
        description: t('tours.planning.create.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABS,
      popover: {
        title: t('tours.planning.tabs.title'),
        description: t('tours.planning.tabs.description'),
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
        title: t('tours.planning.reminders.title'),
        description: t('tours.planning.reminders.description'),
        side: 'left',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.planning.filters.title'),
        description: t('tours.planning.filters.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: t('tours.planning.list.title'),
        description: t('tours.planning.list.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_PAGINATION,
      popover: {
        title: t('tours.planning.pagination.title'),
        description: t('tours.planning.pagination.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_ROUTES,
      popover: {
        title: t('tours.planning.routes.title'),
        description: t('tours.planning.routes.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];
}

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

function areTourTargetsReady(): boolean {
  return REQUIRED_SELECTORS.every((selector) => document.querySelector(selector) !== null);
}

export function PlanningTour() {
  const { t } = useTranslation('screens');
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
        const steps = buildTourSteps(t);
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          steps.length - 1
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
          steps,
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
  }, [shouldRun, userId, blockTours, t]);

  return null;
}
