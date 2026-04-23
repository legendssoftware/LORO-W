'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getTodayIsoDate,
  readDashboardAttendanceTourState,
  writeDashboardAttendanceTourState,
} from '@/lib/dashboard-attendance-tour-storage';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const TOUR_FAQ_DESCRIPTION = `<p>If something looks off, try the following.</p><ul class="loro-driver-tour__faq"><li>Refresh this page to load the latest data.</li><li>Sign out and sign back in if the dashboard feels stuck or out of date.</li><li>Check your network connection if requests keep failing.</li></ul>`;

const TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="attendance-button"]',
    popover: {
      title: 'Attendance Actions',
      description: 'Use this button area to start your shift, take breaks, and end your shift.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="total-hours-worked-section"]',
    popover: {
      title: 'Total Hours Worked',
      description: 'Track your hours for today, this week, this month, and payroll period at a glance.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="attendance-section"]',
    popover: {
      title: 'Attendance Section',
      description: 'Review your monthly attendance card, legend, and quick actions in one place.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="attendance-month-selector"]',
    popover: {
      title: 'Change month',
      description:
        'Use this menu to pick a recent month and view your attendance for past months (up to the last three months).',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="attendance-logs-button"]',
    popover: {
      title: 'View Logs',
      description: 'Open your attendance logs for detailed daily records.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="monthly-attendance-list"]',
    popover: {
      title: 'Monthly Attendance List',
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
  },
];

function areTourTargetsReady(): boolean {
  return TOUR_STEPS.every((step) => {
    if (typeof step.element !== 'string') return true;
    return document.querySelector(step.element) !== null;
  });
}

export function DashboardAttendanceTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/dashboard'),
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
    const stored = readDashboardAttendanceTourState(userId);
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

      writeDashboardAttendanceTourState(userId, {
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
          writeDashboardAttendanceTourState(userId, {
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

          writeDashboardAttendanceTourState(userId, {
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
