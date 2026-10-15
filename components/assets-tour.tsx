'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import type { DriveStep } from 'driver.js';
import { readAssetsTourState, writeAssetsTourState } from '@/lib/assets-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="assets-page-header"]';
const SEL_ADD = '[data-tour="assets-add-button"]';
const SEL_TOOLBAR = '[data-tour="assets-toolbar"]';
const SEL_GRID = '[data-tour="assets-grid"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_GRID] as const;

function buildAssetsSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to Assets',
        description:
          'This page lists equipment and vehicles linked to you, or the whole organisation when you manage inventory. The next steps cover adding an asset, filtering, and opening a record.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Assets overview',
        description:
          'The heading tells you whether you are looking at your linked assets or the organisation inventory. Managers can switch that scope from the filters.',
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
        description:
          'Use Add asset to record equipment or a vehicle, including who owns it and which branch it belongs to.',
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
          'Narrow by date, branch, owner, category, or search. The page size control under the grid sets how many cards load at once.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_GRID,
      popover: {
        title: 'Open an asset',
        description:
          'Each card shows the type icon, name, serial, and owner. Open a card for purchase and insurance details, or to edit and delete.',
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
