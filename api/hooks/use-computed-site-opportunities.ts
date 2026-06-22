'use client';

import { useMemo } from 'react';
import type { MapConfigType, MapMarkerBase } from '@/api/types/map';
import type {
  MapGeocodingSummary,
  SiteOpportunityMode,
  SiteOpportunityResult,
  SiteOpportunitySettings,
} from '@/api/types/site-opportunity';
import {
  computeSiteOpportunities,
  dedupeNearbyGreenfield,
} from '@/lib/site-opportunity/compute';

export function useComputedSiteOpportunities(options: {
  enabled: boolean;
  markers: MapMarkerBase[];
  mapConfig?: MapConfigType;
  geocodingSummary?: MapGeocodingSummary | null;
  branchRevenueById?: Record<string, number>;
  mode: SiteOpportunityMode;
  settings: SiteOpportunitySettings;
}): SiteOpportunityResult | null {
  const {
    enabled,
    markers,
    mapConfig,
    geocodingSummary,
    branchRevenueById,
    mode,
    settings,
  } = options;

  return useMemo(() => {
    if (!enabled || markers.length === 0) return null;

    const revenueMap = new Map(
      Object.entries(branchRevenueById ?? {}).map(([k, v]) => [k, v])
    );

    const result = computeSiteOpportunities(markers, {
      mode,
      settings,
      mapConfig,
      branchRevenueById: revenueMap,
      geocodingSummary: geocodingSummary ?? null,
    });

    return {
      ...result,
      greenfield: dedupeNearbyGreenfield(result.greenfield),
    };
  }, [
    enabled,
    markers,
    mapConfig,
    geocodingSummary,
    branchRevenueById,
    mode,
    settings,
  ]);
}
