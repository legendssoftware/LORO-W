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
import { TOUR_FAQ_DESCRIPTION } from '@/lib/tour-faq-copy';

const SEL_HEADER = '[data-tour="visualiser-page-header"]';
const SEL_ACTIONS = '[data-tour="visualiser-header-actions"]';
const SEL_MAP = '[data-tour="visualiser-map"]';
const SEL_PANEL = '[data-tour="visualiser-simulation-panel"]';

const REQUIRED = [SEL_HEADER, SEL_ACTIONS, SEL_MAP] as const;

function buildVisualiserSteps(): DriveStep[] {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to Competitor Overview',
        description:
          'Map branches, competitors, and clients, then simulate catchments and turnover. Planning Routes can send you here when you need the map.',
      },
    },
    {
      element: SEL_HEADER,
      popover: {
        title: 'Map overview',
        description:
          'Search the map and follow a sales rep’s route, or open the side panel to simulate a catchment.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_ACTIONS,
      popover: {
        title: 'Map tools',
        description:
          'Map data summary counts what is on the map. Geocode fills missing addresses. Export downloads the simulation. Simulate opens the catchment and turnover panel.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: SEL_MAP,
      popover: {
        title: 'The map',
        description:
          'Branches, HQ, competitors, and clients. Planning’s Routes tab links here when you want the geographic view.',
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
        description:
          'Set a catchment, run turnover, and review the stores that fall inside the radius.',
        side: 'left',
        align: 'start',
      },
    });
  }

  steps.push({
    popover: {
      title: 'Having issues?',
      description: TOUR_FAQ_DESCRIPTION,
    },
  });

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
