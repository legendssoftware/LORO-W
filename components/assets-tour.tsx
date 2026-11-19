'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DriveStep } from 'driver.js';
import { readAssetsTourState, writeAssetsTourState } from '@/lib/assets-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="assets-page-header"]';
const SEL_ADD = '[data-tour="assets-add-button"]';
const SEL_TOOLBAR = '[data-tour="assets-toolbar"]';
const SEL_GRID = '[data-tour="assets-grid"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_GRID] as const;

function buildAssetsSteps(t: TFunction): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.assets.header.title'),
        description: t('tours.assets.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
  ];

  if (typeof document !== 'undefined' && document.querySelector(SEL_ADD)) {
    steps.push({
      element: SEL_ADD,
      popover: {
        title: t('tours.assets.add.title'),
        description: t('tours.assets.add.description'),
        side: 'bottom',
        align: 'end',
      },
    });
  }

  steps.push(
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.assets.filters.title'),
        description: t('tours.assets.filters.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_GRID,
      popover: {
        title: t('tours.assets.list.title'),
        description: t('tours.assets.list.description'),
        side: 'top',
        align: 'center',
      },
    }
  );

  return steps;
}

function areAssetsTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function AssetsTour() {
  const { t } = useTranslation('screens');
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;

  const enabled = useMemo(
    () => Boolean(isLoaded && isSignedIn && userId && pathname === '/assets' && !blockTours),
    [isLoaded, isSignedIn, userId, pathname, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readAssetsTourState,
    write: writeAssetsTourState,
    areTargetsReady: areAssetsTargetsReady,
    getSteps: () => buildAssetsSteps(t),
  });

  return null;
}
