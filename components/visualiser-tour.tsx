'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DriveStep } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessCompetitors } from '@/lib/access';
import {
  readVisualiserTourState,
  writeVisualiserTourState,
} from '@/lib/visualiser-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="visualiser-page-header"]';
const SEL_ACTIONS = '[data-tour="visualiser-header-actions"]';
const SEL_MAP = '[data-tour="visualiser-map"]';
const REQUIRED = [SEL_HEADER, SEL_ACTIONS, SEL_MAP] as const;

function buildVisualiserSteps(t: TFunction): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.visualiser.header.title'),
        description: t('tours.visualiser.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_ACTIONS,
      popover: {
        title: t('tours.visualiser.tools.title'),
        description: t('tours.visualiser.tools.description'),
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: SEL_MAP,
      popover: {
        title: t('tours.visualiser.map.title'),
        description: t('tours.visualiser.map.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];

  return steps;
}

function areVisualiserTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function VisualiserTour() {
  const { t } = useTranslation('screens');
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessCompetitors(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded &&
          isSignedIn &&
          userId &&
          pathname === '/visualiser' &&
          allowed &&
          !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readVisualiserTourState,
    write: writeVisualiserTourState,
    areTargetsReady: areVisualiserTargetsReady,
    getSteps: () => buildVisualiserSteps(t),
  });

  return null;
}
