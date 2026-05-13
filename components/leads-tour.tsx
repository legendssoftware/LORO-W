'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { readLeadsTourState, writeLeadsTourState, getCurrentYearMonth } from '@/lib/leads-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_HEADER = '[data-tour="leads-page-header"]';
const SEL_CREATE = '[data-tour="leads-create-banner"]';
const SEL_TOOLBAR = '[data-tour="leads-toolbar"]';
const SEL_TABLE = '[data-tour="leads-table"]';
const SEL_FIRST_GROUP = '[data-tour="leads-first-group-row"]';
const SEL_FIRST_LEAD = '[data-tour="leads-first-lead-row"]';
const SEL_LEAD_DIALOG = '[data-tour="lead-detail-dialog"]';

/** Selectors that only exist after expand / open — do not block tour start. */
const DYNAMIC_STEP_SELECTORS = new Set<string>([SEL_FIRST_LEAD, SEL_LEAD_DIALOG]);

const TOUR_INTRO_DESCRIPTION =
  'Welcome to Leads. This page helps you create leads quickly, filter and search your pipeline, and manage follow-ups in one place. The next steps highlight the main areas you will use every day.';

function areBaseTargetsReady(steps: DriveStep[]): boolean {
  return steps.every((step) => {
    if (typeof step.element !== 'string') return true;
    if (DYNAMIC_STEP_SELECTORS.has(step.element)) return true;
    return document.querySelector(step.element) !== null;
  });
}

function hasNonEmptyLeadList(): boolean {
  return document.querySelector(SEL_FIRST_GROUP) !== null;
}

function buildEmptyTourSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to Leads',
        description: TOUR_INTRO_DESCRIPTION,
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Leads overview',
        description: 'This section gives context for the page and your lead workflow.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_CREATE,
      popover: {
        title: 'Create lead',
        description: 'Use this quick action area to add new leads immediately.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Filter, search, and import',
        description:
          'By default, your date range is this month so you see current pipeline activity. Change the date range whenever you need to review another period. Combine filters, search, and import to narrow the list.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: 'Lead history',
        description:
          'Leads are grouped by owner (or Unassigned). Click a person row to expand that group. Inside the table, click a lead row to open full lead details in a dialog.',
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
}

function buildDataTourSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to Leads',
        description: TOUR_INTRO_DESCRIPTION,
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Leads overview',
        description: 'This section gives context for the page and your lead workflow.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_CREATE,
      popover: {
        title: 'Create lead',
        description: 'Use this quick action area to add new leads immediately.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Filter, search, and import',
        description:
          'By default, your date range is this month so you see current pipeline activity. Change the date range whenever you need to review another period. Combine filters, search, and import to narrow the list.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: 'Lead history',
        description:
          'Leads are grouped by owner (or Unassigned). Click a person row to expand that group. Inside the table, click a lead row to open full lead details in a dialog.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_FIRST_GROUP,
      popover: {
        title: 'Expand a group',
        description:
          'Each row is a teammate or Unassigned. Use the chevron to know it expands—click the row to see every lead in that bucket.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_FIRST_LEAD,
      popover: {
        title: 'Open a lead',
        description:
          'We are opening the first lead in this group for you. Any row opens the same detail view—pick the lead you care about.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_LEAD_DIALOG,
      popover: {
        title: 'Lead detail',
        description:
          'This dialog is the full workspace for one lead—status, activity, edits, and actions. Close it when you are done to return to the list.',
        side: 'left',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Having issues?',
        description: TOUR_FAQ_DESCRIPTION,
      },
    },
  ];
}

function getActiveStepElement(driverInstance: Driver): string {
  const st = driverInstance.getActiveStep();
  return typeof st?.element === 'string' ? st.element : '';
}

export function LeadsTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);
  const didAutoOpenFirstLeadRef = useRef(false);
  const programmaticDestroyRef = useRef(false);

  const shouldRun = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/leads'),
    [isLoaded, isSignedIn, userId, pathname]
  );

  useEffect(() => {
    if (!shouldRun || !userId) {
      hasAttemptedStartRef.current = false;
      wasCompletedRef.current = false;
      didAutoOpenFirstLeadRef.current = false;
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
      wasCompletedRef.current = false;
      didAutoOpenFirstLeadRef.current = false;
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
    const stored = readLeadsTourState(userId);
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
      const extended = hasNonEmptyLeadList();
      const steps = extended ? buildDataTourSteps() : buildEmptyTourSteps();

      if (!areBaseTargetsReady(steps)) {
        pollCount += 1;
        if (pollCount < maxPollCount) {
          window.setTimeout(tryStartTour, pollMs);
        }
        return;
      }

      const boundedStartIndex = Math.min(
        Math.max(0, currentState.resumeIndex),
        steps.length - 1
      );

      writeLeadsTourState(userId, {
        period,
        resumeIndex: boundedStartIndex,
        completedThisMonth: false,
      });

      const faqIndex = steps.length - 1;

      const driverObj = driver({
        showProgress: true,
        smoothScroll: true,
        allowClose: true,
        popoverClass: DRIVER_TOUR_POPOVER_CLASS,
        nextBtnText: 'Next',
        prevBtnText: 'Previous',
        doneBtnText: 'Done',
        steps,
        onHighlighted: (element, _step, { driver: activeDriver }) => {
          const stepEl = getActiveStepElement(activeDriver);

          if (stepEl === SEL_FIRST_GROUP) {
            const row =
              (element as HTMLElement | undefined) ??
              (document.querySelector(SEL_FIRST_GROUP) as HTMLElement | null);
            if (row) {
              const alreadyOpen =
                row.getAttribute('aria-expanded') === 'true' ||
                document.querySelector(SEL_FIRST_LEAD) !== null;
              if (!alreadyOpen) {
                row.click();
              }
              window.setTimeout(() => {
                activeDriver.refresh();
              }, 260);
            }
          }

          if (stepEl === SEL_FIRST_LEAD && !didAutoOpenFirstLeadRef.current) {
            const leadRow =
              (element as HTMLElement | undefined) ??
              (document.querySelector(SEL_FIRST_LEAD) as HTMLElement | null);
            if (leadRow) {
              didAutoOpenFirstLeadRef.current = true;
              leadRow.click();
              window.setTimeout(() => {
                activeDriver.refresh();
                if (document.querySelector(SEL_LEAD_DIALOG)) {
                  activeDriver.moveNext();
                }
              }, 360);
            }
          }

          const activeIndex = activeDriver.getActiveIndex() ?? 0;
          writeLeadsTourState(userId, {
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
          const stepEl = getActiveStepElement(activeDriver);
          if (stepEl === SEL_FIRST_GROUP) {
            window.setTimeout(() => {
              if (document.querySelector(SEL_FIRST_LEAD)) {
                activeDriver.moveNext();
              } else {
                activeDriver.moveTo(faqIndex);
              }
            }, 180);
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
          didAutoOpenFirstLeadRef.current = false;
          persistAfterDriverDestroyed({
            userId,
            write: writeLeadsTourState,
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
      didAutoOpenFirstLeadRef.current = false;
    };
  }, [shouldRun, userId, blockTours]);

  return null;
}
