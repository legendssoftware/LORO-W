'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

function buildCallsSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.calls.header.title'),
        description: t('tours.calls.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.calls.filters.title'),
        description: t('tours.calls.filters.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABLE,
      popover: {
        title: t('tours.calls.list.title'),
        description: t('tours.calls.list.description'),
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
  const { t } = useTranslation('screens');
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
    getSteps: () => buildCallsSteps(t),
  });

  return null;
}
