'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getCurrentYearMonth,
  readSettingsTourState,
  writeSettingsTourState,
} from '@/lib/settings-tour-storage';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const TOUR_INTRO_DESCRIPTION =
  'This is Settings, where organisation configuration is managed. The next steps highlight tabs, the active form panel, and where to save your changes.';

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Settings',
      description: TOUR_INTRO_DESCRIPTION,
    },
  },
  {
    element: '[data-tour="settings-page-header"]',
    popover: {
      title: 'Settings overview',
      description:
        'Use this page to manage organisation profile, appearance, regional defaults, operating hours, and branches.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-tab-nav"]',
    popover: {
      title: 'Switch between sections',
      description:
        'These tabs group all settings into focused sections. Select a tab to edit that part of your organisation setup.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="settings-active-panel"]',
    popover: {
      title: 'Active settings panel',
      description:
        'The selected tab renders here. Update fields for the current section before saving at the bottom.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="settings-panel-actions"]',
    popover: {
      title: 'Save or discard',
      description:
        'Use Save changes to persist updates for this section, or Cancel to revert local form edits.',
      side: 'top',
      align: 'end',
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

export function SettingsTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().pendingBlockingWarning;
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/settings'),
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
    if (blockTours) {
      hasAttemptedStartRef.current = false;
      driverRef.current?.destroy();
      driverRef.current = null;
      return;
    }
    if (hasAttemptedStartRef.current) return;
    hasAttemptedStartRef.current = true;

    const period = getCurrentYearMonth();
    const stored = readSettingsTourState(userId);
    const currentState = stored ?? {
      period,
      resumeIndex: 0,
      completedThisMonth: false,
    };

    if (currentState.period !== period) {
      currentState.period = period;
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

      writeSettingsTourState(userId, {
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
          writeSettingsTourState(userId, {
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
          const activeIndex = activeDriver.getActiveIndex() ?? boundedStartIndex;
          const didComplete = wasCompletedRef.current;
          wasCompletedRef.current = false;

          writeSettingsTourState(userId, {
            period: getCurrentYearMonth(),
            resumeIndex: didComplete ? 0 : activeIndex,
            completedThisMonth: didComplete,
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
  }, [shouldRun, userId, blockTours]);

  return null;
}
