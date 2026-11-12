'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessMerchandise } from '@/lib/access';
import { readMerchandiseTourState, writeMerchandiseTourState } from '@/lib/merchandise-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="merchandise-page-header"]';
const SEL_CREATE = '[data-tour="merchandise-create-button"]';
const SEL_TOOLBAR = '[data-tour="merchandise-toolbar"]';
const SEL_LIST = '[data-tour="merchandise-list"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_LIST] as const;

function buildMerchandiseSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: 'Merchandise',
        description: 'Field photos and notes, with review status on each log.',
        side: 'bottom',
        align: 'start',
      },
    },
  ];

  if (typeof document !== 'undefined' && document.querySelector(SEL_CREATE)) {
    steps.push({
      element: SEL_CREATE,
      popover: {
        title: 'New merchandise',
        description:
          'Click New merchandise. Attach a photo, name the client, and add comments. The log stays in review until it is published.',
        side: 'bottom',
        align: 'end',
      },
    });
  }

  steps.push(
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Filter logs',
        description: 'Filter by date, page size, branch, teammate, status, or search.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LIST,
      popover: {
        title: 'Open a log',
        description: 'Click a row for the full photo and review actions.',
        side: 'top',
        align: 'center',
      },
    }
  );

  return steps;
}

function areMerchandiseTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function MerchandiseTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessMerchandise(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded && isSignedIn && userId && pathname === '/merchandise' && allowed && !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readMerchandiseTourState,
    write: writeMerchandiseTourState,
    areTargetsReady: areMerchandiseTargetsReady,
    getSteps: buildMerchandiseSteps,
  });

  return null;
}
