'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';
import {
  arePageTourTargetsReady,
  buildPageTourSteps,
  getPageTour,
} from '@/lib/page-tour-registry';
import type { TourMonthState } from '@/lib/tour-monthly-persist';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';

function readUnused(_userId: string): TourMonthState | null {
  return null;
}

function writeUnused(_userId: string, _state: TourMonthState): void {}

/**
 * Monthly driver.js tour for signed-in pages that share the page-tour registry.
 */
export function RegistryPageTour() {
  const pathname = usePathname() ?? '';
  const config = getPageTour(pathname);
  const { isLoaded, isSignedIn, userId } = useAuth();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;

  const enabled = useMemo(
    () => Boolean(config && isLoaded && isSignedIn && userId && !blockTours),
    [config, isLoaded, isSignedIn, userId, blockTours],
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: config?.read ?? readUnused,
    write: config?.write ?? writeUnused,
    areTargetsReady: () => (config ? arePageTourTargetsReady(config) : false),
    getSteps: () => (config ? buildPageTourSteps(config) : []),
  });

  return null;
}
