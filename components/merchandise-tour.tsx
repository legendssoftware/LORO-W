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
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="merchandise-page-header"]';
const SEL_CREATE = '[data-tour="merchandise-create-button"]';
const SEL_TOOLBAR = '[data-tour="merchandise-toolbar"]';
const SEL_LIST = '[data-tour="merchandise-list"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_LIST] as const;

function buildMerchandiseSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to Merchandise',
        description:
          'Merchandise logs are photos and notes from the field. The next steps cover creating a log, filtering the list, and opening an entry.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Merchandise overview',
        description:
          'This page tracks merchandise logs, their review status, and the photos attached to each one.',
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
          'Use New merchandise to attach a photo, name the client, and add comments. The log starts in review until it is published.',
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
        description:
          'Filter by date, how many rows to show, branch, teammate, status, or search. Icons on each control match the visits filters.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_LIST,
      popover: {
        title: 'Open a log',
        description:
          'Each row shows the attached photo, client, status, and owner. Open a row for the full image, organisation, and review actions.',
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
