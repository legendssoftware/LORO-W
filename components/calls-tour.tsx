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

const SEL_HEADER = '[data-tour="calls-page-header"]';
const SEL_TOOLBAR = '[data-tour="calls-toolbar"]';
const SEL_TABLE = '[data-tour="calls-table"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_TABLE] as const;

function buildCallsSteps(): DriveStep[] {
  return [
    {
      element: SEL_HEADER,
      popover: {
        title: 'Call recordings',
        description:
          'PBX calls (Linkus or a desk phone) and in-app LORO calls are listed here with score and transcript status. Visits stay on the Visits page.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Filter recordings',
        description:
          'The range is this month through today. Change date, status, direction, branch, or search to narrow the list.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: 'Open a recording',
        description: 'Click a row for the transcript, score, and audio.',
        side: 'top',
        align: 'center',
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
