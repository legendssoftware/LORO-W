'use client';

import { useAuth } from '@clerk/nextjs';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { OverviewMap } from '@/app/visualiser/components/overview-map';
import { VisualiserHeaderActions } from '@/app/visualiser/components/visualiser-header-actions';
import { SimulationSidePanel } from '@/app/visualiser/components/simulation-side-panel';
import { useVisualiserPrefetch } from '@/app/visualiser/use-visualiser-prefetch';
import { useVisualiserMapLayers } from '@/app/visualiser/hooks/use-visualiser-map-layers';
import { DEFAULT_LAYER_VISIBILITY } from '@/app/visualiser/hooks/use-visualiser-map-layers';
import { VisualiserSimulationProvider } from '@/app/visualiser/simulation-context';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';

function VisualiserBody() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();

  const ready = Boolean(isSignedIn && isTokenReady && profile);
  const orgRef = profile?.organisationRef ?? profile?.organisation?.ref;

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <main
        className={cn(
          appPageMainClass,
          'flex min-h-0 flex-1 flex-col overflow-hidden'
        )}
      >
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">
              Competitor Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Map branches, HQ, competitors, and clients — search and track a
              sales rep’s route on the map, or simulate catchments and turnover
              in the side panel.
            </p>
          </div>
          <VisualiserHeaderActions
            points={allPoints}
            counts={counts}
            disabled={!ready}
          />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
          {!ready ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : (
            <>
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <OverviewMap enabled orgRef={orgRef} />
              </div>
              <SimulationSidePanel />
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
      <VisualiserBody />
    </VisualiserSimulationProvider>
  );
}
