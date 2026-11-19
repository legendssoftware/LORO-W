'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { readLeadsTourState, writeLeadsTourState, getCurrentYearMonth } from '@/lib/leads-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_HEADER = '[data-tour="leads-page-header"]';
const SEL_CREATE = '[data-tour="leads-create-button"]';
const SEL_TOOLBAR = '[data-tour="leads-toolbar"]';
const SEL_IMPORT = '[data-tour="leads-import"]';
const SEL_TABLE = '[data-tour="leads-table"]';
const SEL_FIRST_GROUP = '[data-tour="leads-first-group-row"]';
const SEL_FIRST_LEAD = '[data-tour="leads-first-lead-row"]';
const SEL_LEAD_DIALOG = '[data-tour="lead-detail-dialog"]';

/** Selectors that only exist after expand / open — do not block tour start. */
const DYNAMIC_STEP_SELECTORS = new Set<string>([SEL_FIRST_LEAD, SEL_LEAD_DIALOG]);

function buildEmptyTourSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.leads.header.title'),
        description: t('tours.leads.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_CREATE,
      popover: {
        title: t('tours.leads.create.title'),
        description: t('tours.leads.create.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.leads.toolbar.title'),
        description: t('tours.leads.toolbar.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: () => visibleImportButton() ?? document.body,
      popover: {
        title: t('tours.leads.import.title'),
        description: t('tours.leads.import.description'),
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: t('tours.leads.list.title'),
        description: t('tours.leads.list.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];
}

function buildDataTourSteps(t: TFunction): DriveStep[] {
  return [
    ...buildEmptyTourSteps(t),
    {
      element: SEL_FIRST_GROUP,
      popover: {
        title: t('tours.leads.expand.title'),
        description: t('tours.leads.expand.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_FIRST_LEAD,
      popover: {
        title: t('tours.leads.open.title'),
        description: t('tours.leads.open.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_LEAD_DIALOG,
      popover: {
        title: t('tours.leads.detail.title'),
        description: t('tours.leads.detail.description'),
        side: 'left',
        align: 'start',
      },
    },
  ];
}
function visibleImportButton(): Element | undefined {
  const nodes = Array.from(document.querySelectorAll(SEL_IMPORT));
  const visible = nodes.find(
    (node) => node instanceof HTMLElement && node.getClientRects().length > 0
  );
  return visible ?? nodes[0];
}

function areBaseTargetsReady(steps: DriveStep[]): boolean {
  if (document.querySelector(SEL_IMPORT) === null) return false;
  return steps.every((step) => {
    if (typeof step.element !== 'string') return true;
    if (DYNAMIC_STEP_SELECTORS.has(step.element)) return true;
    return document.querySelector(step.element) !== null;
  });
}

function hasNonEmptyLeadList(): boolean {
  return document.querySelector(SEL_FIRST_GROUP) !== null;
}

function getActiveStepElement(driverInstance: Driver): string {
  const st = driverInstance.getActiveStep();
  return typeof st?.element === 'string' ? st.element : '';
}

export function LeadsTour() {
  const { t } = useTranslation('screens');
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

    const cancelSchedule = scheduleTourWhenReady({
      areTargetsReady: () => {
        const extended = hasNonEmptyLeadList();
        const steps = extended ? buildDataTourSteps(t) : buildEmptyTourSteps(t);
        return areBaseTargetsReady(steps);
      },
      onReady: () => {
        const extended = hasNonEmptyLeadList();
        const steps = extended ? buildDataTourSteps(t) : buildEmptyTourSteps(t);

        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          steps.length - 1
        );

        writeLeadsTourState(userId, {
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
                  return;
                }
                wasCompletedRef.current = true;
                activeDriver.destroy();
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
      didAutoOpenFirstLeadRef.current = false;
    };
  }, [shouldRun, userId, blockTours, t]);

  return null;
}
