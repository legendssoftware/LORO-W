'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, MapPinned, Loader2 } from 'lucide-react';
import {
  siteOpportunitiesQueryKey,
  useReportsMapData,
  useSiteOpportunities,
  useTokenReady,
  useBranches,
  useBranchMapMarkers,
  useCompetitorsInfinite,
  useCompetitorMapMarkers,
  useMapGeocodeBackfillMutation,
  totalCompetitorBranchCappedPending,
} from '@/api/hooks';
import type { GetMapReportParams } from '@/api/endpoints/map';
import type { GetSiteOpportunitiesParams } from '@/api/endpoints/site-opportunities';
import type { SyncProfile } from '@/api/types';
import {
  DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  type SiteOpportunityMode,
  type SiteOpportunityResult,
  type SiteOpportunitySettings,
  type SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { VisitHistoryToolbar } from '@/components/visits-table/visit-history-toolbar';
import {
  filterMapMarkers,
  getSortedUniqueBusinessTypesFromMarkers,
  getSortedUniqueRegionsFromMarkers,
} from '@/lib/utils/map-marker-filters';
import { TYPE_OF_BUSINESS_OPTIONS } from '@/lib/visit-form-utils';
import { debugApi } from '@/lib/api-debug';
import { useVisitsStore } from '@/store/visits-store';
import type { ReportsMode } from '@/app/reports/reports-mode';
import { excludeCheckInRelatedMapMarkers } from '@/app/reports/utils/filter-map-markers-no-checkins';
import {
  filterInfluenceCirclesForMarkers,
  mergeInfluenceCircles,
} from '@/app/reports/utils/merge-influence-circles';
import { mergeBranchMapMarkers } from '@/app/reports/utils/merge-branch-map-markers';
import { mergeCompetitorMapMarkers } from '@/app/reports/utils/merge-competitor-map-markers';
import { SiteOpportunityPanel } from '@/app/reports/components/site-opportunity-panel';
import { SiteOpportunityToolbar } from '@/app/reports/components/site-opportunity-toolbar';

const ReportsVisualiserMap = dynamic(
  () => import('./reports-visualiser-map').then((m) => m.ReportsVisualiserMap),
  { ssr: false }
);

const EMPTY_SITE_OPPORTUNITIES: SiteOpportunityResult = {
  catchments: [],
  greenfield: [],
  dataQuality: {
    totalCompetitors: 0,
    competitorsWithCoords: 0,
    totalClients: 0,
    clientsWithCoords: 0,
    totalBranches: 0,
    branchesWithCoords: 0,
    competitorCoveragePct: 100,
    clientCoveragePct: 100,
  },
  settings: DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  warnings: [],
  geocodingSummary: null,
};

const OPPORTUNITY_SETTINGS_DEBOUNCE_MS = 500;

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
  const queryClient = useQueryClient();

  const { selectedRegion, selectedBusinessType } = useVisitsStore();

  const [showOpportunities, setShowOpportunities] = useState(false);
  const prevShowOpportunitiesRef = useRef(false);
  const [opportunityMode, setOpportunityMode] =
    useState<SiteOpportunityMode>('both');
  const [opportunitySettings, setOpportunitySettings] =
    useState<SiteOpportunitySettings>(DEFAULT_SITE_OPPORTUNITY_SETTINGS);
  const [debouncedOpportunitySettings, setDebouncedOpportunitySettings] =
    useState<SiteOpportunitySettings>(DEFAULT_SITE_OPPORTUNITY_SETTINGS);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | null
  >(null);
  const [opportunitySelectionSeq, setOpportunitySelectionSeq] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedOpportunitySettings(opportunitySettings);
    }, OPPORTUNITY_SETTINGS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [opportunitySettings]);

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

  const siteOpportunityParams = useMemo((): GetSiteOpportunitiesParams => {
    return {
      ...mapReportParams,
      region: selectedRegion || undefined,
      businessType: selectedBusinessType || undefined,
      mode: opportunityMode,
      settings: debouncedOpportunitySettings,
    };
  }, [
    mapReportParams,
    selectedRegion,
    selectedBusinessType,
    opportunityMode,
    debouncedOpportunitySettings,
  ]);

  const mapReport = useReportsMapData(mapReportParams, { enabled: mounted });
  const { data: branches = [], refetch: refetchBranches } = useBranches({ enabled: mounted });
  const competitorsQuery = useCompetitorsInfinite({ enabled: mounted });
  const backfillMutation = useMapGeocodeBackfillMutation();
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);

  const pendingGeocodes = totalCompetitorBranchCappedPending(mapReport.data?.geocodingSummary);

  const runMapGeocodeBackfill = useCallback(() => {
    setBackfillMessage('Resolving missing competitor and branch coordinates…');
    return backfillMutation
      .mutateAsync({
        resetExhausted: true,
        bypassCache: true,
        scope: 'competitors,branches',
      })
      .then((result) => {
        setBackfillMessage(
          result.complete
            ? 'Competitor and branch coordinates updated.'
            : 'Some competitor or branch addresses still need coordinates — check CRM data or run again.'
        );
        return Promise.all([
          mapReport.refetch(),
          refetchBranches(),
          competitorsQuery.refetch(),
        ]);
      })
      .catch((err: unknown) => {
        setBackfillMessage(
          err instanceof Error ? err.message : 'Could not backfill map coordinates.'
        );
      });
  }, [backfillMutation, competitorsQuery.refetch, mapReport.refetch, refetchBranches]);

  const branchListMarkers = useBranchMapMarkers(branches, {
    enabled: mounted && branches.length > 0,
  });
  const competitorListMarkers = useCompetitorMapMarkers(competitorsQuery.data, {
    enabled: mounted && competitorsQuery.data.length > 0,
  });

  useEffect(() => {
    if (!mounted) return;
    if (competitorsQuery.hasNextPage && !competitorsQuery.isFetchingNextPage) {
      void competitorsQuery.fetchNextPage();
    }
  }, [
    mounted,
    competitorsQuery.hasNextPage,
    competitorsQuery.isFetchingNextPage,
    competitorsQuery.fetchNextPage,
    competitorsQuery.data,
  ]);

  const siteOpportunitiesQuery = useSiteOpportunities(siteOpportunityParams, {
    enabled: mounted && showOpportunities,
  });

  const opportunitiesBusy =
    showOpportunities &&
    (siteOpportunitiesQuery.isPending || siteOpportunitiesQuery.isFetching);

  useEffect(() => {
    if (mounted && showOpportunities && !prevShowOpportunitiesRef.current) {
      void siteOpportunitiesQuery.refetch();
    }
    prevShowOpportunitiesRef.current = showOpportunities;
  }, [mounted, showOpportunities, siteOpportunitiesQuery]);

  useEffect(() => {
    if (showOpportunities) return;
    void queryClient.cancelQueries({
      queryKey: siteOpportunitiesQueryKey(siteOpportunityParams),
    });
  }, [showOpportunities, queryClient, siteOpportunityParams]);

  useEffect(() => {
    debugApi('suggested-areas:status', {
      status: siteOpportunitiesQuery.status,
      fetchStatus: siteOpportunitiesQuery.fetchStatus,
      catchments: siteOpportunitiesQuery.data?.catchments.length ?? null,
      greenfield: siteOpportunitiesQuery.data?.greenfield.length ?? null,
    });
  }, [
    siteOpportunitiesQuery.status,
    siteOpportunitiesQuery.fetchStatus,
    siteOpportunitiesQuery.data,
  ]);

  const handleSelectOpportunity = useCallback((zone: SiteOpportunityZone) => {
    setSelectedOpportunityId(zone.id);
    setShowOpportunities(true);
    setOpportunitySelectionSeq((n) => n + 1);
  }, []);

  const opportunityPanelProps = useMemo(
    () => ({
      catchments: siteOpportunitiesQuery.data?.catchments ?? [],
      greenfield: siteOpportunitiesQuery.data?.greenfield ?? [],
      dataQuality:
        siteOpportunitiesQuery.data?.dataQuality ??
        EMPTY_SITE_OPPORTUNITIES.dataQuality,
      warnings: siteOpportunitiesQuery.data?.warnings ?? [],
      captureSettings:
        siteOpportunitiesQuery.data?.settings ?? opportunitySettings,
      selectedZoneId: selectedOpportunityId,
      onSelectZone: handleSelectOpportunity,
      isLoading: opportunitiesBusy,
      isError: siteOpportunitiesQuery.isError,
      hasLoadedData: siteOpportunitiesQuery.data != null,
      errorMessage:
        siteOpportunitiesQuery.error instanceof Error
          ? siteOpportunitiesQuery.error.message
          : siteOpportunitiesQuery.isError
            ? 'Could not load suggested areas.'
            : undefined,
    }),
    [
      handleSelectOpportunity,
      opportunitiesBusy,
      opportunitySettings,
      selectedOpportunityId,
      siteOpportunitiesQuery.data,
      siteOpportunitiesQuery.error,
      siteOpportunitiesQuery.isError,
    ]
  );

  const handleToggleOpportunities = useCallback(() => {
    setShowOpportunities((v) => {
      const next = !v;
      debugApi('suggested-areas:toggle', {
        on: next,
        mapReady: mapReport.isSuccess,
        willFetch: next,
      });
      if (!next) {
        setSelectedOpportunityId(null);
      }
      return next;
    });
  }, [mapReport.isSuccess]);

  const handleSuggestedAreasFromMap = useCallback(() => {
    if (!showOpportunities) {
      debugApi('suggested-areas:toggle', {
        on: true,
        mapReady: mapReport.isSuccess,
        willFetch: true,
        source: 'map',
      });
      setShowOpportunities(true);
      return;
    }
    debugApi('suggested-areas:toggle', {
      on: false,
      mapReady: mapReport.isSuccess,
      willFetch: false,
      source: 'map',
    });
    setShowOpportunities(false);
    setSelectedOpportunityId(null);
  }, [mapReport.isSuccess, showOpportunities]);

  const baseMarkers = useMemo(() => {
    const fromReport = excludeCheckInRelatedMapMarkers(
      mapReport.data?.allMarkers ?? []
    );
    const withBranches = mergeBranchMapMarkers(fromReport, branchListMarkers.data);
    return mergeCompetitorMapMarkers(withBranches, competitorListMarkers.data);
  }, [
    mapReport.data?.allMarkers,
    branchListMarkers.data,
    competitorListMarkers.data,
  ]);

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

  const mapOpportunityCatchments =
    siteOpportunitiesQuery.data?.catchments ?? EMPTY_SITE_OPPORTUNITIES.catchments;
  const mapOpportunityGreenfield =
    siteOpportunitiesQuery.data?.greenfield ?? EMPTY_SITE_OPPORTUNITIES.greenfield;

  if (!mounted) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  return (
    <section className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0">
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
        extraFilters={
          <>
          <SiteOpportunityToolbar
            className="border-0 py-0 px-0 shrink-0"
            showOpportunities={showOpportunities}
            onToggleShow={handleToggleOpportunities}
            mode={opportunityMode}
            onModeChange={setOpportunityMode}
            settings={opportunitySettings}
            onSettingsChange={(patch) =>
              setOpportunitySettings((s) => ({ ...s, ...patch }))
            }
            isLoading={opportunitiesBusy}
            isError={siteOpportunitiesQuery.isError}
            errorMessage={
              siteOpportunitiesQuery.error instanceof Error
                ? siteOpportunitiesQuery.error.message
                : siteOpportunitiesQuery.isError
                  ? 'Could not load suggested areas.'
                  : undefined
            }
            warnings={siteOpportunitiesQuery.data?.warnings ?? []}
            dataQuality={siteOpportunitiesQuery.data?.dataQuality}
            catchments={mapOpportunityCatchments}
            greenfield={mapOpportunityGreenfield}
            onSelectZone={handleSelectOpportunity}
          />
            {reportsMode === 'org' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={backfillMutation.isPending}
                onClick={() => void runMapGeocodeBackfill()}
                title="Forward-geocode competitor and branch addresses missing lat/lng and save to database"
              >
                {backfillMutation.isPending ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <MapPinned className="size-4 mr-1.5" />
                )}
                Re-geocode map
              </Button>
            ) : null}
          </>
        }
      />
      </div>
      <div className="flex flex-1 min-h-0 h-full overflow-hidden flex-row relative">
        {mapReport.isError ? (
          <p
            className="absolute left-0 right-0 top-0 z-[2001] mx-auto max-w-lg rounded-b-md border-x border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            {mapReport.error?.message ?? 'Could not load map data.'}
          </p>
        ) : null}
        {backfillMutation.isPending || backfillMessage ? (
          <p
            className="absolute left-0 right-0 top-0 z-[2001] mx-auto max-w-lg rounded-b-md border-x border-b border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
            role="status"
          >
            {backfillMutation.isPending
              ? 'Resolving missing competitor and branch coordinates…'
              : backfillMessage}
          </p>
        ) : pendingGeocodes > 0 && reportsMode === 'org' ? (
          <p
            className="absolute left-0 right-0 top-0 z-[2001] mx-auto max-w-lg rounded-b-md border-x border-b border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground"
            role="status"
          >
            {pendingGeocodes} competitor or branch addresses need coordinates — use Re-geocode map or run the CLI backfill.
          </p>
        ) : null}
        {showOpportunities && siteOpportunitiesQuery.isError ? (
          <p
            className="absolute left-0 right-0 top-10 z-[2001] mx-auto max-w-lg rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            {siteOpportunitiesQuery.error?.message ??
              'Could not load suggested areas.'}
          </p>
        ) : null}
        <ReportsVisualiserMap
          allMarkers={filteredMarkers}
          influenceCircles={influenceCircles}
          mapLayerBusy={mapReport.isFetching && !mapReport.isError}
          className="flex-1 min-h-0 min-w-0 h-full"
          showOpportunities={showOpportunities}
          opportunityCatchments={mapOpportunityCatchments}
          opportunityGreenfield={mapOpportunityGreenfield}
          selectedOpportunityId={selectedOpportunityId}
          opportunitySelectionSeq={opportunitySelectionSeq}
          onSelectOpportunity={handleSelectOpportunity}
          onSuggestedAreas={handleSuggestedAreasFromMap}
        />
        {showOpportunities ? (
          <SiteOpportunityPanel
            {...opportunityPanelProps}
            className="hidden lg:flex h-full max-h-full"
          />
        ) : null}
      </div>
      {showOpportunities ? (
        <div className="lg:hidden border-t h-[40vh] max-h-[40vh] shrink-0 overflow-hidden flex flex-col">
          <SiteOpportunityPanel
            {...opportunityPanelProps}
            className="border-l-0 w-full h-full max-h-full"
          />
        </div>
      ) : null}
    </section>
  );
}
