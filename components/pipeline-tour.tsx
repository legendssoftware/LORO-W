'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getCurrentYearMonth,
  readPipelineTourState,
  writePipelineTourState,
} from '@/lib/pipeline-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_HEADER = '[data-tour="pipeline-page-header"]';
const SEL_TARGETS = '[data-tour="pipeline-targets-section"]';
const SEL_QUOTATIONS = '[data-tour="pipeline-quotations-section"]';
const SEL_LEAD = '[data-tour="pipeline-lead-pipeline-section"]';
const SEL_VISITS = '[data-tour="pipeline-visits-section"]';

const REQUIRED_SELECTORS = [SEL_HEADER, SEL_QUOTATIONS, SEL_LEAD, SEL_VISITS] as const;

function areRequiredDomTargetsReady(): boolean {
  return REQUIRED_SELECTORS.every((sel) => document.querySelector(sel) !== null);
}

function buildPipelineSteps(includeTargets: boolean): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: 'Pipeline',
        description:
          'Targets, quotations, leads, and visit outcomes for the period you can see.',
        side: 'bottom',
        align: 'start',
      },
    },
  ];
  if (includeTargets) {
    steps.push({
      element: SEL_TARGETS,
      popover: {
        title: 'Targets',
        description:
          'Progress on sales, leads, check-ins, and calls for the current target period.',
        side: 'bottom',
        align: 'center',
      },
    });
  }
  steps.push(
    {
      element: SEL_QUOTATIONS,
      popover: {
        title: 'Quotations',
        description:
          'Change the ERP date window to load quotation lines. Compare them with LORO quotations in the same period.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LEAD,
      popover: {
        title: 'Leads',
        description:
          'Counts, pipeline value, and quote value from visits. Open a status to see the breakdown for this range.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_VISITS,
      popover: {
        title: 'Visits',
        description: 'Check-out totals for this range: visits, sales, quotes, and values.',
        side: 'top',
        align: 'center',
      },
    }
  );
  return steps;
}

export function PipelineTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);
  const programmaticDestroyRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/pipeline'),
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
    const stored = readPipelineTourState(userId);
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
      areTargetsReady: areRequiredDomTargetsReady,
      onReady: () => {
        const includeTargets = document.querySelector(SEL_TARGETS) !== null;
        const steps = buildPipelineSteps(includeTargets);
        const stepCount = steps.length;

        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          stepCount - 1
        );

        writePipelineTourState(userId, {
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
            const activeIndex = activeDriver.getActiveIndex() ?? 0;
            writePipelineTourState(userId, {
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
              write: writePipelineTourState,
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
