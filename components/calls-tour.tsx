'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessCallRecordings } from '@/lib/access';
import { readCallsTourState, writeCallsTourState } from '@/lib/calls-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="calls-page-header"]';
const SEL_TOOLBAR = '[data-tour="calls-toolbar"]';
const SEL_TABLE = '[data-tour="calls-table"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_TABLE] as const;

function buildCallsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to Call recordings',
        description:
          'Company-line and in-app calls land here with origin, score, and transcript status. The next steps cover filters and the recording list.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Recordings overview',
        description:
          'PBX calls come from Linkus or a desk handset. In-app calls were started from LORO. Visits on the Visits page are a separate log.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Filter recordings',
        description:
          'Narrow by date, status, direction, branch, and search. The default range is this month through today.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: 'Open a recording',
        description:
          'Each row shows when the call happened, who was on it, duration, score, and transcript status. Open a row for the transcript, score, and audio.',
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

function areCallsTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function CallsTour() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessCallRecordings(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded && isSignedIn && userId && pathname === '/calls' && allowed && !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readCallsTourState,
    write: writeCallsTourState,
    areTargetsReady: areCallsTargetsReady,
    getSteps: buildCallsSteps,
  });

  return null;
}
