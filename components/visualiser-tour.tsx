'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
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
const SEL_PANEL = '[data-tour="visualiser-simulation-panel"]';

const REQUIRED = [SEL_HEADER, SEL_ACTIONS, SEL_MAP] as const;

function buildVisualiserSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SEL_HEADER,
      popover: {
        title: 'Competitor Overview',
        description: 'Search the map or follow a rep’s route. Open Simulate to model a catchment.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_ACTIONS,
      popover: {
        title: 'Map tools',
        description:
          'Summary counts competitor stores and modelled monthly turnover. Petrol prices loads the latest fuel prices and keeps stored prices when nothing changed. Geocode fills missing addresses. Export downloads the simulation. Simulate opens the catchment panel.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: SEL_MAP,
      popover: {
        title: 'The map',
        description: 'Pins are branches, HQ, competitors, and clients.',
        side: 'top',
        align: 'center',
      },
    },
  ];

  if (document.querySelector(SEL_PANEL)) {
    steps.push({
      element: SEL_PANEL,
      popover: {
        title: 'Simulation panel',
        description: 'Set the catchment radius, run turnover, and see which stores fall inside it.',
        side: 'left',
        align: 'start',
      },
    });
  }

  return steps;
}

function areVisualiserTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function VisualiserTour() {
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
    getSteps: buildVisualiserSteps,
  });

  return null;
}
