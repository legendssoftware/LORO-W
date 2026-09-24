'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  useCalculateMyRouteMutation,
  useOptimizedRoutes,
  useSessionSync,
  useTokenReady,
} from '@/api/hooks';
import type { OptimizedRoute } from '@/api/types/tasks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { OverviewMap } from '@/app/visualiser/components/overview-map';
import { VisualiserHeaderActions } from '@/app/visualiser/components/visualiser-header-actions';
import { SimulationSidePanel } from '@/app/visualiser/components/simulation-side-panel';
import { useVisualiserPrefetch } from '@/app/visualiser/use-visualiser-prefetch';
import { useVisualiserMapLayers } from '@/app/visualiser/hooks/use-visualiser-map-layers';
import { DEFAULT_LAYER_VISIBILITY } from '@/app/visualiser/hooks/use-visualiser-map-layers';
import { VisualiserSimulationProvider } from '@/app/visualiser/simulation-context';
import { canAccessCompetitors } from '@/lib/access';
import { formatUtcYmd, utcTomorrow } from '@/lib/utils/overview-daily-summary';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';

const UTC_YMD = /^\d{4}-\d{2}-\d{2}$/;

function VisualiserBody() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const searchParams = useSearchParams();

  const ready = Boolean(isSignedIn && isTokenReady && profile);
  const orgRef = profile?.organisationRef ?? profile?.organisation?.ref;
  const limited = ready && !canAccessCompetitors(profile?.accessLevel);
  const routeDate = UTC_YMD.test(searchParams.get('date') ?? '')
    ? (searchParams.get('date') as string)
    : formatUtcYmd(utcTomorrow());

  useVisualiserPrefetch({
    enabled: ready,
    visualiserMode: 'org',
    profile,
  });

  const { allPoints, counts } = useVisualiserMapLayers({
    enabled: ready,
    orgRef,
    visibility: DEFAULT_LAYER_VISIBILITY,
  });

  const routesQuery = useOptimizedRoutes(routeDate, { enabled: limited });
  const calculateMine = useCalculateMyRouteMutation();
  const calculateMyRoute = calculateMine.mutate;
  const ensuredDateRef = useRef<string | null>(null);

  const plannedRoute = useMemo((): OptimizedRoute | null => {
    if (!limited || profile?.uid == null) return null;
    return routesQuery.data?.find((route) => route.userId === profile.uid) ?? null;
  }, [limited, profile?.uid, routesQuery.data]);

  useEffect(() => {
    if (!limited || profile?.uid == null) return;
    if (routesQuery.isLoading || routesQuery.isFetching) return;
    if ((plannedRoute?.coordinates?.length ?? 0) >= 2) return;
    if (ensuredDateRef.current === routeDate || calculateMine.isPending) return;
    ensuredDateRef.current = routeDate;
    calculateMyRoute(routeDate);
  }, [
    limited,
    profile?.uid,
    routesQuery.isLoading,
    routesQuery.isFetching,
    plannedRoute?.coordinates?.length,
    routeDate,
    calculateMine.isPending,
    calculateMyRoute,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <main
        className={cn(
          appPageMainClass,
          'flex min-h-0 flex-1 flex-col overflow-hidden'
        )}
      >
        <div
          className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          data-tour="visualiser-page-header"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">
              Competitor Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {limited
                ? 'Map branches, HQ, competitors, and clients, plus your planned visit route for the selected day.'
                : 'Map branches, HQ, competitors, and clients — search and track a sales rep’s route on the map, or simulate catchments and turnover in the side panel.'}
            </p>
          </div>
          <VisualiserHeaderActions
            points={allPoints}
            counts={counts}
            disabled={!ready}
            limited={limited}
          />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
          {!ready ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : (
            <>
              <div
                className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
                data-tour="visualiser-map"
              >
                <OverviewMap
                  enabled
                  orgRef={orgRef}
                  showRepTracking={!limited}
                  plannedRoute={limited ? plannedRoute : null}
                />
              </div>
              {limited ? null : <SimulationSidePanel />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export function VisualiserContent() {
  return (
    <VisualiserSimulationProvider>
      <Suspense fallback={<LoadingSpinner wrapperClassName="py-12" />}>
        <VisualiserBody />
      </Suspense>
    </VisualiserSimulationProvider>
  );
}
