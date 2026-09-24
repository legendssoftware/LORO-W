'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessPerformanceTracker } from '@/lib/access';
import {
  readPerformanceTourState,
  writePerformanceTourState,
} from '@/lib/performance-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="performance-page-header"]';
const SEL_TOOLBAR = '[data-tour="performance-toolbar"]';
const SEL_CONSOLIDATED = '[data-tour="performance-consolidated-toggle"]';
const SEL_SUMMARY = '[data-tour="performance-summary"]';
const SEL_CHARTS = '[data-tour="performance-charts"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_CONSOLIDATED] as const;

function buildPerformanceSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to Performance',
        description:
          'Sales performance for the countries, branches, and dates you can see. The next steps cover filters, targets, charts, and the consolidated statement.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Performance tracker',
        description:
          'The title switches to Consolidated Statement when that view is open.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Dates and filters',
        description:
          'Set the date range, open filters for country, branch, and category, and refresh when you want a new pull from the server.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_CONSOLIDATED,
      popover: {
        title: 'Consolidated statement',
        description:
          'Switch to the consolidated income statement across countries and branches, then come back to the performance report.',
        side: 'bottom',
        align: 'end',
      },
    },
  ];

  if (document.querySelector(SEL_SUMMARY)) {
    steps.push({
      element: SEL_SUMMARY,
      popover: {
        title: 'Target and gross profit',
        description:
          'Revenue against target, and gross profit for the same range, when those figures are available.',
        side: 'bottom',
        align: 'center',
      },
    });
  }

  if (document.querySelector(SEL_CHARTS)) {
    steps.push({
      element: SEL_CHARTS,
      popover: {
        title: 'Charts',
        description:
          'Category, branch, payment mix, products, salespeople, and hourly sales for the current filters.',
        side: 'top',
        align: 'center',
      },
    });
  }

  steps.push({
    popover: {
      title: 'Having issues?',
      description: TOUR_FAQ_DESCRIPTION,
    },
  });

  return steps;
}

function arePerformanceTargetsReady(): boolean {
  if (document.querySelector('[data-tour="performance-loading"]')) return false;
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function PerformanceTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessPerformanceTracker(backendUserData);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded &&
          isSignedIn &&
          userId &&
          pathname === '/performance' &&
          allowed &&
          !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readPerformanceTourState,
    write: writePerformanceTourState,
    areTargetsReady: arePerformanceTargetsReady,
    getSteps: buildPerformanceSteps,
    maxPollCount: 80,
  });

  return null;
}
