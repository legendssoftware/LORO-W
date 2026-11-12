'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep } from 'driver.js';
import { readAssetsTourState, writeAssetsTourState } from '@/lib/assets-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="assets-page-header"]';
const SEL_ADD = '[data-tour="assets-add-button"]';
const SEL_TOOLBAR = '[data-tour="assets-toolbar"]';
const SEL_GRID = '[data-tour="assets-grid"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_GRID] as const;

function buildAssetsSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: 'Assets',
        description:
          'Your linked equipment and vehicles, or the whole organisation inventory if you manage it. Managers switch that scope in the filters.',
        side: 'bottom',
        align: 'start',
      },
    },
  ];

  if (typeof document !== 'undefined' && document.querySelector(SEL_ADD)) {
    steps.push({
      element: SEL_ADD,
      popover: {
        title: 'Add an asset',
        description: 'Click Add asset. Record the item, who owns it, and which branch it belongs to.',
        side: 'bottom',
        align: 'end',
      },
    });
  }

  steps.push(
    {
      element: SEL_TOOLBAR,
      popover: {
        title: 'Filter the inventory',
        description:
          'Filter by date, branch, owner, category, or search. Page size under the grid sets how many cards load.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_GRID,
      popover: {
        title: 'Open an asset',
        description: 'Click a card for purchase and insurance details, or to edit and delete it.',
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
    getSteps: buildAssetsSteps,
  });

  return null;
}
