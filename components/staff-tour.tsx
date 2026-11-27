'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { tourButtonLabels } from '@/lib/use-monthly-page-tour';
import type { TFunction } from 'i18next';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getCurrentYearMonth, readStaffTourState, writeStaffTourState } from '@/lib/staff-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_HEADER = '[data-tour="staff-page-header"]';
const SEL_TOOLBAR = '[data-tour="staff-toolbar"]';
const SEL_GRID = '[data-tour="staff-grid"]';
const SEL_ADD_USER = '[data-tour="staff-add-user"]';
const SEL_TRAVEL = '[data-tour="staff-travel-export"]';

const REQUIRED_SELECTORS = [SEL_HEADER, SEL_TOOLBAR, SEL_GRID] as const;

function buildStaffSteps(t: TFunction): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.staff.header.title'),
        description: t('tours.staff.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
  ];

  if (document.querySelector(SEL_ADD_USER)) {
    steps.push({
      element: SEL_ADD_USER,
      popover: {
        title: t('tours.staff.add.title'),
        description: t('tours.staff.add.description'),
        side: 'bottom',
        align: 'end',
      },
    });
  }

  steps.push(
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.staff.toolbar.title'),
        description: t('tours.staff.toolbar.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_GRID,
      popover: {
        title: t('tours.staff.grid.title'),
        description: t('tours.staff.grid.description'),
        side: 'top',
        align: 'center',
      },
    }
  );

  if (document.querySelector(SEL_TRAVEL)) {
    steps.push({
      element: SEL_TRAVEL,
      popover: {
        title: t('tours.staff.travel.title'),
        description: t('tours.staff.travel.description'),
        side: 'left',
        align: 'center',
      },
    });
  }

  return steps;
}

function areTourTargetsReady(): boolean {
  return REQUIRED_SELECTORS.every((selector) => document.querySelector(selector) !== null);
}

export function StaffTour() {
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
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/staff'),
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
    const stored = readStaffTourState(userId);
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
        const steps = buildStaffSteps(t);
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          steps.length - 1
        );

        writeStaffTourState(userId, {
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
            writeStaffTourState(userId, {
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
              write: writeStaffTourState,
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
