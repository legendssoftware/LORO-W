'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep, Driver } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessWellbeingDashboard } from '@/lib/access';
import { readWellbeingTourState, writeWellbeingTourState } from '@/lib/wellbeing-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="wellbeing-page-header"]';
const SEL_TOOLBAR = '[data-tour="wellbeing-toolbar"]';
const SEL_TABS = '[data-tour="wellbeing-tabs"]';
const SEL_TODAY = '[data-tour="wellbeing-today"]';
const SEL_RADIAL = '[data-tour="wellbeing-radial"]';
const SEL_TAB_EXECUTIVE = '[data-tour="wellbeing-tab-executive"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_TABS, SEL_TODAY] as const;

function isOnScreen(selector: string): boolean {
  const node = document.querySelector(selector);
  return node instanceof HTMLElement && node.getClientRects().length > 0;
}

function revealWellbeingStep(stepElement: string, activeDriver: Driver): void {
  if (stepElement !== SEL_RADIAL || isOnScreen(SEL_RADIAL)) return;
  const tab = document.querySelector(SEL_TAB_EXECUTIVE);
  if (tab instanceof HTMLElement) tab.click();
  window.setTimeout(() => {
    activeDriver.refresh();
  }, 320);
}

function buildWellbeingSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to Wellbeing',
        description:
          'This dashboard is the daily employee pulse for managers, HR, and executives. The next steps cover filters, today’s board, and the executive index.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Wellbeing overview',
        description:
          'Mood check-ins, named follow-ups, and how mood lines up with performance in the selected window.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Date and branch',
        description:
          'Insights, Executive, and Correlations use this date range and branch. Today is the live board and does not depend on the range.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABS,
      popover: {
        title: 'Today, Insights, Executive, Correlations',
        description:
          'Today is check-ins and follow-ups. Insights summarises the range. Executive shows radial indexes. Correlations compares mood with performance. These are estimates, not causes.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TODAY,
      popover: {
        title: 'Today',
        description:
          'KPIs, branch comparison, and named lists for support and people who need a follow-up.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_RADIAL,
      popover: {
        title: 'Executive index',
        description:
          'On Executive, each radial is a rolled-up index for the selected range and branch.',
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

function areWellbeingTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function WellbeingTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessWellbeingDashboard(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded &&
          isSignedIn &&
          userId &&
          pathname === '/wellbeing' &&
          allowed &&
          !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readWellbeingTourState,
    write: writeWellbeingTourState,
    areTargetsReady: areWellbeingTargetsReady,
    getSteps: buildWellbeingSteps,
    onHighlight: revealWellbeingStep,
  });

  return null;
}
