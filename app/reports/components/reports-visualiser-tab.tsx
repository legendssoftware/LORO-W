'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, MapPinned, Loader2, Globe2 } from 'lucide-react';
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
  useLatestRepLocations,
  useRepLocationStream,
  usePerformanceDashboard,
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
  type TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { VisitHistoryToolbar } from '@/components/visits-table/visit-history-toolbar';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import {
  getSortedUniqueBusinessTypesFromMarkers,
} from '@/lib/utils/map-marker-filters';
import {
  buildMapMarkerGeoIndex,
  filterMapMarkersFromIndex,
} from '@/lib/utils/map-marker-geo-index';
import {
  loadVisualiserPreferences,
  saveVisualiserPreferences,
} from '@/lib/visualiser-preferences';
import { buildUnmappedMapEntries } from '@/lib/utils/unmapped-map-entries';
import { filterRepLocationsByGeoBoundsDetailed } from '@/lib/utils/filter-rep-locations-by-geo';
import { TYPE_OF_BUSINESS_OPTIONS } from '@/lib/visit-form-utils';
import { debugApi } from '@/lib/api-debug';
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
import { VisualiserMapSummaryDialog } from '@/app/reports/components/visualiser-map-summary-dialog';
import { SuggestedAreasInfoDialog } from '@/app/reports/components/suggested-areas-info-dialog';
import { MapPinIcon } from '@/lib/icons';
import { useEnrichedCatchments } from '@/lib/site-opportunity/enrich-catchment-revenue';
import { needsCompetitorBranchGeocodeBackfill } from '@/api/hooks/use-map-geocode-backfill';

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
/** Greenfield engine needs clusters of ≥2 geolocated competitors. */
const MIN_GEO_COMPETITORS_FOR_SUGGESTED_AREAS = 2;

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

  const [selectedCountry, setSelectedCountry] = useState(
    () => loadVisualiserPreferences().selectedCountry
  );
  const [selectedProvince, setSelectedProvince] = useState(
    () => loadVisualiserPreferences().selectedProvince
  );

  const [showOpportunities, setShowOpportunities] = useState(
    () => loadVisualiserPreferences().showOpportunities
  );
  const [showSalesRepLocations, setShowSalesRepLocations] = useState(
    () => loadVisualiserPreferences().showSalesRepLocations
  );
  const [repLocationsMaxAgeHours] = useState(
    () => loadVisualiserPreferences().repLocationsMaxAgeHours
  );
  const prevShowOpportunitiesRef = useRef(false);
  const [opportunityMode, setOpportunityMode] = useState<SiteOpportunityMode>(
    () => loadVisualiserPreferences().opportunityMode
  );
  const [opportunitySettings, setOpportunitySettings] =
    useState<SiteOpportunitySettings>(
      () => loadVisualiserPreferences().opportunitySettings
    );
  const [debouncedOpportunitySettings, setDebouncedOpportunitySettings] =
    useState<SiteOpportunitySettings>(
      () => loadVisualiserPreferences().opportunitySettings
    );
  const [turnoverOverrides, setTurnoverOverrides] =
    useState<TurnoverOverrideSettings>(
      () => loadVisualiserPreferences().turnoverOverrides
    );
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

  useEffect(() => {
    saveVisualiserPreferences({
      selectedCountry,
      selectedProvince,
      showOpportunities,
      opportunityMode,
      opportunitySettings,
      turnoverOverrides,
      showSalesRepLocations,
      repLocationsMaxAgeHours,
    });
  }, [
    selectedCountry,
    selectedProvince,
    showOpportunities,
    opportunityMode,
    opportunitySettings,
    turnoverOverrides,
    showSalesRepLocations,
    repLocationsMaxAgeHours,
  ]);

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
      country: selectedCountry || undefined,
      province: selectedProvince || undefined,
      mode: opportunityMode,
      settings: debouncedOpportunitySettings,
    };
  }, [
    mapReportParams,
    selectedCountry,
    selectedProvince,
    opportunityMode,
    debouncedOpportunitySettings,
  ]);

  const mapReport = useReportsMapData(mapReportParams, { enabled: mounted });
  const repLocationsQuery = useLatestRepLocations(
    { maxAgeHours: repLocationsMaxAgeHours },
    { enabled: mounted && showSalesRepLocations }
  );
  useRepLocationStream({
    enabled: mounted && showSalesRepLocations,
    maxAgeHours: repLocationsMaxAgeHours,
  });
  const repLocationsRaw = repLocationsQuery.data?.locations ?? [];
  const { data: branches = [], refetch: refetchBranches } = useBranches({
    enabled: mounted,
  });
  const competitorsQuery = useCompetitorsInfinite({ enabled: mounted });
  const backfillMutation = useMapGeocodeBackfillMutation();
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);

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
          err instanceof Error
            ? err.message
            : 'Could not backfill map coordinates.'
        );
      });
  }, [
    backfillMutation,
    competitorsQuery.refetch,
    mapReport.refetch,
    refetchBranches,
  ]);

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
    if (
      mounted &&
      showOpportunities &&
      !prevShowOpportunitiesRef.current
    ) {
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
      country: selectedCountry || null,
      province: selectedProvince || null,
      catchments: siteOpportunitiesQuery.data?.catchments.length ?? null,
      greenfield: siteOpportunitiesQuery.data?.greenfield.length ?? null,
    });
  }, [
    siteOpportunitiesQuery.status,
    siteOpportunitiesQuery.fetchStatus,
    siteOpportunitiesQuery.data,
    selectedCountry,
    selectedProvince,
  ]);

  const handleSelectOpportunity = useCallback((zone: SiteOpportunityZone) => {
    setSelectedOpportunityId(zone.id);
    setShowOpportunities(true);
    setOpportunitySelectionSeq((n) => n + 1);
  }, []);

  const handleToggleOpportunities = useCallback(() => {
    setShowOpportunities((v) => {
      const next = !v;
      debugApi('suggested-areas:toggle', {
        on: next,
        mapReady: mapReport.isSuccess,
        willFetch: next,
        country: selectedCountry || null,
      });
      if (!next) {
        setSelectedOpportunityId(null);
      }
      return next;
    });
  }, [mapReport.isSuccess, selectedCountry]);

  const handleSuggestedAreasFromMap = useCallback(() => {
    if (!showOpportunities) {
      debugApi('suggested-areas:toggle', {
        on: true,
        mapReady: mapReport.isSuccess,
        willFetch: true,
        source: 'map',
        country: selectedCountry || null,
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
  }, [mapReport.isSuccess, selectedCountry, showOpportunities]);

  const handleCloseOpportunities = useCallback(() => {
    debugApi('suggested-areas:close', {
      mapReady: mapReport.isSuccess,
      country: selectedCountry || null,
    });
    setShowOpportunities(false);
    setSelectedOpportunityId(null);
    setOpportunitySelectionSeq(0);
    void queryClient.invalidateQueries({
      queryKey: siteOpportunitiesQueryKey(siteOpportunityParams),
    });
  }, [
    mapReport.isSuccess,
    queryClient,
    selectedCountry,
    siteOpportunityParams,
  ]);

  const handleCountryChange = useCallback((value: string) => {
    const next = value === 'all' ? '' : value;
    setSelectedCountry(next);
    setSelectedProvince('');
  }, []);

  const handleProvinceChange = useCallback((value: string) => {
    setSelectedProvince(value === 'all' ? '' : value);
  }, []);

  const baseMarkers = useMemo(() => {
    const fromReport = excludeCheckInRelatedMapMarkers(
      mapReport.data?.allMarkers ?? []
    );
    const withBranches = mergeBranchMapMarkers(
      fromReport,
      branchListMarkers.data
    );
    return mergeCompetitorMapMarkers(
      withBranches,
      competitorListMarkers.data
    );
  }, [
    mapReport.data?.allMarkers,
    branchListMarkers.data,
    competitorListMarkers.data,
  ]);

  const markerGeoIndex = useMemo(
    () => buildMapMarkerGeoIndex(baseMarkers),
    [baseMarkers]
  );

  const uniqueRegions = markerGeoIndex.regions;

  const uniqueCountries = markerGeoIndex.countries;

  const uniqueProvinces = useMemo(
    () =>
      selectedCountry
        ? markerGeoIndex.provincesByCountry.get(selectedCountry) ?? []
        : [],
    [markerGeoIndex.provincesByCountry, selectedCountry]
  );

  const countryPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      uniqueCountries.map((country) => ({
        value: country,
        label: country,
        icon: <Globe2 className="size-4 shrink-0" />,
      })),
    [uniqueCountries]
  );

  const provincePickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      uniqueProvinces.map((province) => ({
        value: province,
        label: province,
        icon: <MapPinIcon className="size-4 shrink-0" />,
      })),
    [uniqueProvinces]
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
      filterMapMarkersFromIndex(markerGeoIndex, {
        selectedCountry: selectedCountry || undefined,
        selectedProvince: selectedProvince || undefined,
      }),
    [markerGeoIndex, selectedCountry, selectedProvince]
  );

  const repLocationGeo = useMemo(
    () =>
      filterRepLocationsByGeoBoundsDetailed(repLocationsRaw, filteredMarkers, {
        selectedCountry: selectedCountry || undefined,
        selectedProvince: selectedProvince || undefined,
      }),
    [repLocationsRaw, filteredMarkers, selectedCountry, selectedProvince]
  );
  const repLocations = repLocationGeo.locations;

  const branchMarkers = useMemo(
    () => filteredMarkers.filter((m) => String(m.markerType ?? '') === 'branch'),
    [filteredMarkers]
  );

  const orgLogoUrl = mapReport.data?.organisation?.logo ?? null;

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
    siteOpportunitiesQuery.data?.catchments ??
    EMPTY_SITE_OPPORTUNITIES.catchments;
  const mapOpportunityGreenfield =
    siteOpportunitiesQuery.data?.greenfield ??
    EMPTY_SITE_OPPORTUNITIES.greenfield;

  const { data: performanceDashboard } = usePerformanceDashboard({
    enabled: mounted && showOpportunities,
  });
  const enrichedCatchments = useEnrichedCatchments(
    mapOpportunityCatchments,
    branches,
    performanceDashboard,
  );

  const insufficientGeoWarning = useMemo(() => {
    if (!showOpportunities) return null;
    const dq = siteOpportunitiesQuery.data?.dataQuality;
    if (!dq) return null;
    if (dq.competitorsWithCoords >= MIN_GEO_COMPETITORS_FOR_SUGGESTED_AREAS) {
      return null;
    }
    return 'Not enough geolocated stores in this area — try another province or Re-geocode map.';
  }, [showOpportunities, siteOpportunitiesQuery.data?.dataQuality]);

  const geocodePendingBanner = useMemo(() => {
    if (!mounted || reportsMode !== 'org') return null;
    const summary = mapReport.data?.geocodingSummary;
    if (!needsCompetitorBranchGeocodeBackfill(summary)) return null;
    const pending =
      (summary?.competitors?.cappedPending ?? 0) +
      (summary?.branches?.cappedPending ?? 0);
    return `${pending} competitor/branch address(es) still need geocoding — use Re-geocode map to place them on the map.`;
  }, [mounted, mapReport.data?.geocodingSummary, reportsMode]);

  const unmappedEntries = useMemo(
    () =>
      buildUnmappedMapEntries({
        branches,
        competitors: competitorsQuery.data,
        mapMarkers: mapReport.data?.allMarkers ?? [],
      }),
    [branches, competitorsQuery.data, mapReport.data?.allMarkers]
  );

  const opportunityPanelProps = useMemo(
    () => ({
      catchments: enrichedCatchments,
      greenfield: siteOpportunitiesQuery.data?.greenfield ?? [],
      dataQuality:
        siteOpportunitiesQuery.data?.dataQuality ??
        EMPTY_SITE_OPPORTUNITIES.dataQuality,
      warnings: siteOpportunitiesQuery.data?.warnings ?? [],
      captureSettings:
        siteOpportunitiesQuery.data?.settings ?? opportunitySettings,
      turnoverOverrides,
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
      onClose: handleCloseOpportunities,
      branchMarkers,
      orgLogoUrl,
    }),
    [
      branchMarkers,
      handleCloseOpportunities,
      handleSelectOpportunity,
      opportunitiesBusy,
      opportunitySettings,
      turnoverOverrides,
      orgLogoUrl,
      selectedOpportunityId,
      siteOpportunitiesQuery.data,
      siteOpportunitiesQuery.error,
      siteOpportunitiesQuery.isError,
      enrichedCatchments,
    ]
  );

  const handleSalesRepLocationsChange = useCallback((value: boolean) => {
    setShowSalesRepLocations(value);
  }, []);

  const geoPickerTriggerClass = 'h-9 min-w-[140px] shrink-0 sm:w-[200px]';

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
          showRegionFilter={false}
          showBusinessTypeFilter={false}
          sectionHeading={null}
          extraFilters={
            <>
              <SearchableOptionListPicker
                selectedValue={selectedCountry || 'all'}
                onValueChange={handleCountryChange}
                options={countryPickerOptions}
                placeholderLabelWhenAll="All countries"
                searchPlaceholder="Search countries…"
                emptyMessage="No countries with markers."
                triggerIcon={<Globe2 className="size-4 shrink-0" />}
                triggerClassName={geoPickerTriggerClass}
              />
              <SearchableOptionListPicker
                selectedValue={selectedProvince || 'all'}
                onValueChange={handleProvinceChange}
                options={provincePickerOptions}
                placeholderLabelWhenAll="All provinces"
                searchPlaceholder="Search provinces…"
                emptyMessage={
                  selectedCountry
                    ? 'No provinces in this country.'
                    : 'Select a country first.'
                }
                triggerIcon={<MapPinIcon className="size-4 shrink-0" />}
                triggerClassName={geoPickerTriggerClass}
                disabled={!selectedCountry}
              />
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
                turnoverOverrides={turnoverOverrides}
                onTurnoverOverridesChange={setTurnoverOverrides}
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
                catchments={enrichedCatchments}
                greenfield={mapOpportunityGreenfield}
                onSelectZone={handleSelectOpportunity}
                insufficientGeoWarning={insufficientGeoWarning}
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
          extraActions={
            <>
              <VisualiserMapSummaryDialog
                markers={filteredMarkers}
                unmappedEntries={unmappedEntries}
                organisation={mapReport.data?.organisation}
                selectedCountry={selectedCountry}
                selectedProvince={selectedProvince}
                geocodingSummary={mapReport.data?.geocodingSummary}
              />
              <SuggestedAreasInfoDialog
                triggerClassName="bg-green-600 text-white hover:bg-green-700 hover:text-white border-green-600"
              />
            </>
          }
        />
      </div>
      <div className="flex flex-1 min-h-0 h-full overflow-hidden flex-row relative min-h-[calc(100vh-12rem)]">
        {geocodePendingBanner ? (
          <p
            className="absolute left-0 right-0 top-0 z-[2001] mx-auto max-w-2xl rounded-b-md border-x border-b border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900"
            role="status"
          >
            {geocodePendingBanner}
          </p>
        ) : null}
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
        {showSalesRepLocations &&
        !repLocationsQuery.isPending &&
        !repLocationsQuery.isError &&
        repLocations.length === 0 ? (
          <p
            className="absolute left-0 right-0 top-10 z-[2001] mx-auto max-w-lg rounded-md border border-border bg-background/95 px-3 py-2 text-center text-sm text-muted-foreground shadow-sm"
            role="status"
          >
            {`No recent mobile GPS for active reps (last ${repLocationsMaxAgeHours} ${repLocationsMaxAgeHours === 1 ? 'hour' : 'hours'}). Reps appear here when the mobile app uploads location while on shift.`}
          </p>
        ) : null}
        {showSalesRepLocations && repLocationsQuery.isError ? (
          <p
            className="absolute left-0 right-0 top-10 z-[2001] mx-auto max-w-lg rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            role="alert"
          >
            {repLocationsQuery.error?.message ??
              'Could not load sales rep locations.'}
          </p>
        ) : null}
        <ReportsVisualiserMap
          allMarkers={filteredMarkers}
          influenceCircles={influenceCircles}
          fitBoundsKey={`${selectedCountry}|${selectedProvince}`}
          mapLayerBusy={mapReport.isFetching && !mapReport.isError}
          className="flex-1 min-h-0 min-w-0 h-full"
          showOpportunities={showOpportunities}
          opportunityCatchments={enrichedCatchments}
          opportunityGreenfield={mapOpportunityGreenfield}
          selectedOpportunityId={selectedOpportunityId}
          opportunitySelectionSeq={opportunitySelectionSeq}
          onSelectOpportunity={handleSelectOpportunity}
          onSuggestedAreas={handleSuggestedAreasFromMap}
          branchMarkers={branchMarkers}
          branches={branches}
          orgLogoUrl={orgLogoUrl}
          opportunityCaptureSettings={
            siteOpportunitiesQuery.data?.settings ?? opportunitySettings
          }
          turnoverOverrides={turnoverOverrides}
          repLocations={repLocations}
          showSalesRepLocations={showSalesRepLocations}
          onSalesRepLocationsChange={handleSalesRepLocationsChange}
        />
        {showOpportunities ? (
          <SiteOpportunityPanel
            {...opportunityPanelProps}
            branches={branches}
            className="hidden lg:flex h-full max-h-full"
          />
        ) : null}
      </div>
      {showOpportunities ? (
        <div className="lg:hidden border-t h-[40vh] max-h-[40vh] shrink-0 overflow-hidden flex flex-col">
          <SiteOpportunityPanel
            {...opportunityPanelProps}
            branches={branches}
            className="border-l-0 w-full h-full max-h-full"
          />
        </div>
      ) : null}
    </section>
  );
}
