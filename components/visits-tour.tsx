'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getCurrentYearMonth,
  readVisitsTourState,
  writeVisitsTourState,
} from '@/lib/visits-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const TOUR_INTRO_DESCRIPTION =
  'This is the Visits page: start or end a field visit, log how it went, and review your history in one place. The next steps walk through the header action, filters, and your visit list or map.';

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Visits',
      description: TOUR_INTRO_DESCRIPTION,
    },
  },
  {
    element: '[data-tour="visits-page-header"]',
    popover: {
      title: 'Visits overview',
      description:
        'The heading reminds you that this page is for live visit actions and for looking back at what you have already done.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="visits-visit-action"]',
    popover: {
      title: 'Start or end a visit',
      description:
        'Use Start visit in the page header to pick how you are connecting (in person, phone, and so on). While a visit is running, End visit appears here in red so you can close it and capture notes and outcomes.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="visits-toolbar"]',
    popover: {
      title: 'Filter and explore history',
      description:
        'By default, your range runs from the start of this month through today. Change the dates, region, type of business, teammate, or search text whenever you need another slice of history. Open the visits summary for a grid report, or open Visualiser in the sidebar for the org-wide map view.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="visits-history-content"]',
    popover: {
      title: 'Your visit list or map',
      description:
        'In table view, use rows to open and update visit details. In map view, see where visits happened. Toggle between them from the bar above when you need a different view.',
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

export function VisitsTour() {
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

    let pollCount = 0;
    const maxPollCount = 40;
    const pollMs = 250;

    const tryStartTour = () => {
      if (!areTourTargetsReady()) {
        pollCount += 1;
        if (pollCount < maxPollCount) {
          window.setTimeout(tryStartTour, pollMs);
        }
        return;
      }

      const boundedStartIndex = Math.min(
        Math.max(0, currentState.resumeIndex),
        TOUR_STEPS.length - 1
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
        nextBtnText: 'Next',
        prevBtnText: 'Previous',
        doneBtnText: 'Done',
        steps: TOUR_STEPS,
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
    };

    tryStartTour();

    return () => {
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
