'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { tourButtonLabels } from '@/lib/use-monthly-page-tour';
import type { TFunction } from 'i18next';
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
const SEL_VARIABLE_REM = '[data-tour="home-prr-benefits"]';
const SEL_BONUS = '[data-tour="year-end-bonus-section"]';
const SEL_SECTION = '[data-tour="attendance-section"]';
const SEL_MONTH = '[data-tour="attendance-month-selector"]';
const SEL_LOGS = '[data-tour="attendance-logs-button"]';
const SEL_LIST = '[data-tour="monthly-attendance-list"]';

const REQUIRED_SELECTORS = [SEL_ATTENDANCE, SEL_SECTION, SEL_MONTH, SEL_LOGS, SEL_LIST] as const;

function buildDashboardSteps(t: TFunction): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_ATTENDANCE,
      popover: {
        title: t('tours.dashboard-attendance.clock.title'),
        description: t('tours.dashboard-attendance.clock.description'),
        side: 'bottom',
        align: 'center',
      },
    },
  ];

  if (document.querySelector(SEL_VARIABLE_REM)) {
    steps.push({
      element: SEL_VARIABLE_REM,
      popover: {
        title: t('tours.dashboard-attendance.variablePay.title'),
        description: t('tours.dashboard-attendance.variablePay.description'),
        side: 'top',
        align: 'center',
      },
    });
  }

  if (document.querySelector(SEL_BONUS)) {
    steps.push({
      element: SEL_BONUS,
      popover: {
        title: t('tours.dashboard-attendance.bonus.title'),
        description: t('tours.dashboard-attendance.bonus.description'),
        side: 'top',
        align: 'center',
      },
    });
  }

  steps.push(
    {
      element: SEL_MONTH,
      popover: {
        title: t('tours.dashboard-attendance.month.title'),
        description: t('tours.dashboard-attendance.month.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_LOGS,
      popover: {
        title: t('tours.dashboard-attendance.logs.title'),
        description: t('tours.dashboard-attendance.logs.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LIST,
      popover: {
        title: t('tours.dashboard-attendance.list.title'),
        description: t('tours.dashboard-attendance.list.description'),
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
  const { t } = useTranslation('screens');
  const { t: tCommon } = useTranslation('common');
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
        const steps = buildDashboardSteps(t);
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
          ...tourButtonLabels(tCommon),
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
  }, [shouldRun, userId, blockTours, t]);

  return null;
}
