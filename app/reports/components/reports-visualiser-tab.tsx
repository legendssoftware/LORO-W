'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { MoreHorizontal } from 'lucide-react';
import { useReportsMapData, useTokenReady } from '@/api/hooks';
import type { GetMapReportParams } from '@/api/endpoints/map';
import type { SyncProfile } from '@/api/types';
import { LoadingSpinner } from '@/components/loading-spinner';
import { VisitHistoryToolbar } from '@/components/visits-table/visit-history-toolbar';
import {
  filterMapMarkers,
  getSortedUniqueBusinessTypesFromMarkers,
  getSortedUniqueRegionsFromMarkers,
} from '@/lib/utils/map-marker-filters';
import { TYPE_OF_BUSINESS_OPTIONS } from '@/lib/visit-form-utils';
import { useVisitsStore } from '@/store/visits-store';
import type { ReportsMode } from '@/app/reports/reports-mode';
import { excludeCheckInRelatedMapMarkers } from '@/app/reports/utils/filter-map-markers-no-checkins';
import {
  filterInfluenceCirclesForMarkers,
  mergeInfluenceCircles,
} from '@/app/reports/utils/merge-influence-circles';

const ReportsVisualiserMap = dynamic(
  () => import('./reports-visualiser-map').then((m) => m.ReportsVisualiserMap),
  { ssr: false }
);

export interface ReportsVisualiserTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsVisualiserTab({
  profile,
  reportsMode,
}: ReportsVisualiserTabProps) {
  const { isLoaded: authLoaded } = useAuth();
  const { isTokenReady } = useTokenReady();
  const mounted = authLoaded && isTokenReady;

  const { selectedRegion, selectedBusinessType } = useVisitsStore();

  const mapReportParams = useMemo((): GetMapReportParams => {
    const base: GetMapReportParams = {
      resolveMarkerAddresses: false,
      allTime: true,
    };
    if (reportsMode === 'self' && profile?.uid != null) {
      base.userId = profile.uid;
    }
    return base;
  }, [profile?.uid, reportsMode]);

  const mapReport = useReportsMapData(mapReportParams, { enabled: mounted });

  const baseMarkers = useMemo(
    () => excludeCheckInRelatedMapMarkers(mapReport.data?.allMarkers ?? []),
    [mapReport.data?.allMarkers]
  );

  const uniqueRegions = useMemo(
    () => getSortedUniqueRegionsFromMarkers(baseMarkers),
    [baseMarkers]
  );

  const businessTypeLabelMap = useMemo(
    () => new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.label])),
    []
  );
  const businessTypeIconMap = useMemo(() => {
    const m = new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.icon]));
    m.set('Not set', MoreHorizontal);
    return m;
  }, []);

  const uniqueBusinessTypes = useMemo(
    () => getSortedUniqueBusinessTypesFromMarkers(baseMarkers),
    [baseMarkers]
  );

  const filteredMarkers = useMemo(
    () =>
      filterMapMarkers(baseMarkers, {
        selectedRegion,
        selectedBusinessType,
      }),
    [baseMarkers, selectedRegion, selectedBusinessType]
  );

  const influenceCircles = useMemo(() => {
    const apiCircles = filterInfluenceCirclesForMarkers(
      mapReport.data?.influenceCircles ?? [],
      filteredMarkers
    );
    return mergeInfluenceCircles(
      apiCircles,
      filteredMarkers,
      mapReport.data?.geofenceMapDefaults
    );
  }, [
    mapReport.data?.influenceCircles,
    mapReport.data?.geofenceMapDefaults,
    filteredMarkers,
  ]);

  if (!mounted) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  return (
    <section className="flex flex-col min-h-0">
      <VisitHistoryToolbar
        uniqueRegions={uniqueRegions}
        uniqueBusinessTypes={uniqueBusinessTypes}
        businessTypeLabelMap={businessTypeLabelMap}
        businessTypeIconMap={businessTypeIconMap}
        showDateRange={false}
        showSearch={false}
        showUserFilter={false}
        showVisitsSummaryButton={false}
        showMapTableToggle={false}
        sectionHeading={null}
      />
      <div className="min-h-[500px] h-[70vh] overflow-hidden flex flex-col relative">
        {mapReport.isError ? (
          <p
            className="absolute left-0 right-0 top-0 z-[2001] mx-auto max-w-lg rounded-b-md border-x border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            {mapReport.error?.message ?? 'Could not load map data.'}
          </p>
        ) : null}
        <ReportsVisualiserMap
          allMarkers={filteredMarkers}
          influenceCircles={influenceCircles}
          mapLayerBusy={mapReport.isFetching && !mapReport.isError}
          className="flex-1 min-h-0"
        />
      </div>
    </section>
  );
}
