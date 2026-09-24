'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep, Driver } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessReports } from '@/lib/access';
import { readReportsTourState, writeReportsTourState } from '@/lib/reports-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="reports-page-header"]';
const SEL_TABS = '[data-tour="reports-tabs"]';
const SEL_QUALITY = '[data-tour="reports-call-quality-tab"]';
const SEL_INSIGHTS = '[data-tour="reports-insights-tab"]';
const SEL_EXPORT = '[data-tour="reports-travel-export"]';
const SEL_TAB_QUALITY = '[data-tour="reports-tab-call-quality"]';
const SEL_TAB_INSIGHTS = '[data-tour="reports-tab-insights"]';
const SEL_TAB_PRODUCTIVITY = '[data-tour="reports-tab-productivity"]';

const REQUIRED = [SEL_HEADER, SEL_TABS] as const;

const TAB_FOR_STEP: Record<string, string> = {
  [SEL_QUALITY]: SEL_TAB_QUALITY,
  [SEL_INSIGHTS]: SEL_TAB_INSIGHTS,
  [SEL_EXPORT]: SEL_TAB_PRODUCTIVITY,
};

function isOnScreen(selector: string): boolean {
  const node = document.querySelector(selector);
  return node instanceof HTMLElement && node.getClientRects().length > 0;
}

function revealReportsStep(stepElement: string, activeDriver: Driver): void {
  const tabSelector = TAB_FOR_STEP[stepElement];
  if (!tabSelector || isOnScreen(stepElement)) return;
  const tab = document.querySelector(tabSelector);
  if (tab instanceof HTMLElement) tab.click();
  window.setTimeout(() => {
    activeDriver.refresh();
  }, 320);
}

function buildReportsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to Reports',
        description:
          'Reports covers productivity, targets, call quality, and activity insights for the period you can see. The next steps open the newer tabs.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Reports overview',
        description:
          'The subtitle matches your access: your own numbers, your team, or the whole organisation.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TABS,
      popover: {
        title: 'Report tabs',
        description:
          'Productivity is activity and travel export. Targets is performance against goals. Call quality is coaching from scored calls. Insights groups activity into clusters.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_QUALITY,
      popover: {
        title: 'Call quality',
        description:
          'Leaderboard, funnel, and coaching notes from scored conversations in the selected range.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_INSIGHTS,
      popover: {
        title: 'Insights',
        description:
          'Activity intelligence for the same range: clusters of work, flags, and where time went.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_EXPORT,
      popover: {
        title: 'Travel export',
        description:
          'On Productivity, export the visits and travel workbook for the current date range.',
        side: 'bottom',
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
}

function areReportsTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function ReportsTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessReports(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded && isSignedIn && userId && pathname === '/reports' && allowed && !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readReportsTourState,
    write: writeReportsTourState,
    areTargetsReady: areReportsTargetsReady,
    getSteps: buildReportsSteps,
    onHighlight: revealReportsStep,
  });

  return null;
}
