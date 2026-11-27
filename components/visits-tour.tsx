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
  readVisitsTourState,
  writeVisitsTourState,
} from '@/lib/visits-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

function buildTourSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: '[data-tour="visits-page-header"]',
      popover: {
        title: t('tours.visits.header.title'),
        description: t('tours.visits.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="visits-visit-action"]',
      popover: {
        title: t('tours.visits.visit-action.title'),
        description: t('tours.visits.visit-action.description'),
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="visits-toolbar"]',
      popover: {
        title: t('tours.visits.toolbar.title'),
        description: t('tours.visits.toolbar.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="visits-history-content"]',
      popover: {
        title: t('tours.visits.history-content.title'),
        description: t('tours.visits.history-content.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];
}

function areTourTargetsReady(steps: DriveStep[]): boolean {
  return steps.every((step) => {
    if (typeof step.element !== 'string') return true;
    return document.querySelector(step.element) !== null;
  });
}

export function VisitsTour() {
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
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/visits'),
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
    const stored = readVisitsTourState(userId);
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
      areTargetsReady: () => areTourTargetsReady(buildTourSteps(t)),
      onReady: () => {
        const steps = buildTourSteps(t);
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          steps.length - 1
        );

        writeVisitsTourState(userId, {
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
            writeVisitsTourState(userId, {
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
              write: writeVisitsTourState,
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
