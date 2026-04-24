'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getTodayIsoDate,
  readClientsTourState,
  writeClientsTourState,
} from '@/lib/clients-tour-storage';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const TOUR_INTRO_DESCRIPTION =
  'This is the Clients page: create organisation clients, filter by status and category, and search. The next steps show the page header, filters, and your client cards.';

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Clients',
      description: TOUR_INTRO_DESCRIPTION,
    },
  },
  {
    element: '[data-tour="clients-page-header"]',
    popover: {
      title: 'Clients overview',
      description:
        'Use Add client to register a new client. The subtitle reminds you that this area is for organisation-wide client records.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="clients-toolbar"]',
    popover: {
      title: 'Filter and search',
      description:
        'Filter by client status and category, then search by name, email, or phone. Clear each filter with the X when you want the full list again.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="clients-grid"]',
    popover: {
      title: 'Client cards',
      description:
        'Open a card to see full client details. At the bottom, Load more appears when more results are available from the server.',
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

export function ClientsTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/clients'),
    [isLoaded, isSignedIn, userId, pathname]
  );

  useEffect(() => {
    if (!shouldRun || !userId) {
      hasAttemptedStartRef.current = false;
      wasCompletedRef.current = false;
      driverRef.current?.destroy();
      driverRef.current = null;
      return;
    }
    if (hasAttemptedStartRef.current) return;
    hasAttemptedStartRef.current = true;

    const today = getTodayIsoDate();
    const stored = readClientsTourState(userId);
    const currentState = stored ?? {
      date: today,
      resumeIndex: 0,
      completedToday: false,
    };

    if (currentState.date !== today) {
      currentState.date = today;
      currentState.completedToday = false;
    }

    if (currentState.completedToday) return;

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

      writeClientsTourState(userId, {
        date: today,
        resumeIndex: boundedStartIndex,
        completedToday: false,
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
          writeClientsTourState(userId, {
            date: getTodayIsoDate(),
            resumeIndex: activeIndex,
            completedToday: false,
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
          const activeIndex = activeDriver.getActiveIndex() ?? boundedStartIndex;
          const didComplete = wasCompletedRef.current;
          wasCompletedRef.current = false;

          writeClientsTourState(userId, {
            date: getTodayIsoDate(),
            resumeIndex: didComplete ? 0 : activeIndex,
            completedToday: didComplete,
          });
        },
      });

      driverRef.current = driverObj;
      driverObj.drive(boundedStartIndex);
    };

    tryStartTour();

    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
      wasCompletedRef.current = false;
    };
  }, [shouldRun, userId]);

  return null;
}
