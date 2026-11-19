'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DriveStep } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessPerformanceTracker } from '@/lib/access';
import {
  readPerformanceTourState,
  writePerformanceTourState,
} from '@/lib/performance-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="performance-page-header"]';
const SEL_TOOLBAR = '[data-tour="performance-toolbar"]';
const SEL_CONSOLIDATED = '[data-tour="performance-consolidated-toggle"]';
const SEL_SUMMARY = '[data-tour="performance-summary"]';
const SEL_CHARTS = '[data-tour="performance-charts"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_CONSOLIDATED] as const;

function buildPerformanceSteps(t: TFunction): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.performance.header.title'),
        description: t('tours.performance.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.performance.filters.title'),
        description: t('tours.performance.filters.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_CONSOLIDATED,
      popover: {
        title: t('tours.performance.consolidated.title'),
        description: t('tours.performance.consolidated.description'),
        side: 'bottom',
        align: 'end',
      },
    },
  ];

  if (document.querySelector(SEL_SUMMARY)) {
    steps.push({
      element: SEL_SUMMARY,
      popover: {
        title: t('tours.performance.target.title'),
        description: t('tours.performance.target.description'),
        side: 'bottom',
        align: 'center',
      },
    });
  }

  if (document.querySelector(SEL_CHARTS)) {
    steps.push({
      element: SEL_CHARTS,
      popover: {
        title: t('tours.performance.charts.title'),
        description: t('tours.performance.charts.description'),
        side: 'top',
        align: 'center',
      },
    });
  }

  return steps;
}

function arePerformanceTargetsReady(): boolean {
  if (document.querySelector('[data-tour="performance-loading"]')) return false;
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function PerformanceTour() {
  const { t } = useTranslation('screens');
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
    getSteps: () => buildPerformanceSteps(t),
    maxPollCount: 80,
  });

  return null;
}
