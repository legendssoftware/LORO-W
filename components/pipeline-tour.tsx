'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getTodayIsoDate,
  readPipelineTourState,
  writePipelineTourState,
} from '@/lib/pipeline-tour-storage';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_HEADER = '[data-tour="pipeline-page-header"]';
const SEL_TARGETS = '[data-tour="pipeline-targets-section"]';
const SEL_QUOTATIONS = '[data-tour="pipeline-quotations-section"]';
const SEL_LEAD = '[data-tour="pipeline-lead-pipeline-section"]';
const SEL_VISITS = '[data-tour="pipeline-visits-section"]';

const TOUR_INTRO_DESCRIPTION =
  'Pipeline brings together your sales targets, ERP and LORO quotations, lead analytics, and visit outcomes for the current period. The next steps call out each area on this page.';

const REQUIRED_SELECTORS = [SEL_HEADER, SEL_QUOTATIONS, SEL_LEAD, SEL_VISITS] as const;

function areRequiredDomTargetsReady(): boolean {
  return REQUIRED_SELECTORS.every((sel) => document.querySelector(sel) !== null);
}

function buildPipelineSteps(includeTargets: boolean): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to Pipeline',
        description: TOUR_INTRO_DESCRIPTION,
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Pipeline overview',
        description:
          'The title is fixed; the subtitle reflects what you are allowed to see (for example, personal pipeline vs organisation-wide, depending on your access).',
        side: 'bottom',
        align: 'start',
      },
    },
  ];
  if (includeTargets) {
    steps.push({
      element: SEL_TARGETS,
      popover: {
        title: 'Targets and progress',
        description:
          'When your profile has targets, these cards show progress for sales, leads, check-ins, and calls for the current target period.',
        side: 'bottom',
        align: 'center',
      },
    });
  }
  steps.push(
    {
      element: SEL_QUOTATIONS,
      popover: {
        title: 'Quotations (ERP and LORO)',
        description:
          'Review ERP quotation lines for your range, adjust the ERP date window, and compare with LORO app quotations in period.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LEAD,
      popover: {
        title: 'Lead pipeline',
        description:
          'See lead counts, pipeline value, and visit-linked quote value, then dig into status breakdowns and charts for the selected range.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_VISITS,
      popover: {
        title: 'Visits',
        description:
          'Summarises check-out outcomes in range: totals, sales, quotes, and values where data exists.',
        side: 'top',
        align: 'center',
      },
    },
    {
      popover: {
        title: 'Having issues?',
        description: TOUR_FAQ_DESCRIPTION,
      },
    }
  );
  return steps;
}

export function PipelineTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/pipeline'),
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
    const stored = readPipelineTourState(userId);
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
      if (!areRequiredDomTargetsReady()) {
        pollCount += 1;
        if (pollCount < maxPollCount) {
          window.setTimeout(tryStartTour, pollMs);
        }
        return;
      }

      const includeTargets = document.querySelector(SEL_TARGETS) !== null;
      const steps = buildPipelineSteps(includeTargets);
      const stepCount = steps.length;

      const boundedStartIndex = Math.min(
        Math.max(0, currentState.resumeIndex),
        stepCount - 1
      );

      writePipelineTourState(userId, {
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
        steps,
        onHighlighted: (_element, _step, { driver: activeDriver }) => {
          const activeIndex = activeDriver.getActiveIndex() ?? 0;
          writePipelineTourState(userId, {
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

          writePipelineTourState(userId, {
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
