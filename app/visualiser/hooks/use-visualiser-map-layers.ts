'use client';

import { useEffect, useMemo } from 'react';
import {
  useBranches,
  useClientsInfinite,
  useLatestRepLocations,
} from '@/api/hooks';
import { useCompetitorsMapData } from '@/api/hooks/use-competitors-map-data';
import { useOrganisationProfile } from '@/api/hooks/use-organisation-profile';
import type { CompetitorListItem } from '@/api/types/competitors';
import {
  branchToMapPoints,
  clientToMapPoint,
  competitorToMapPoint,
  organisationHqPoint,
  repLocationToMapPoint,
  type VisualiserLayerId,
  type VisualiserMapPoint,
} from '@/lib/utils/visualiser-map-points';

export type VisualiserLayerVisibility = Record<VisualiserLayerId, boolean>;

export const DEFAULT_LAYER_VISIBILITY: VisualiserLayerVisibility = {
  branches: true,
  hq: true,
  clients: true,
  competitors: true,
  reps: true,
};

/**
 * Parallel fetch of branches, HQ, clients, competitors, and latest rep GPS for the map.
 */
export function useVisualiserMapLayers(options: {
  enabled: boolean;
  orgRef?: string | null;
  visibility: VisualiserLayerVisibility;
}) {
  const { enabled, orgRef, visibility } = options;

  const branchesQuery = useBranches({ enabled });
  const orgQuery = useOrganisationProfile(orgRef, { enabled });
  const competitorsQuery = useCompetitorsMapData({ enabled });
  const clientsQuery = useClientsInfinite({ enabled });
  const repsQuery = useLatestRepLocations({ maxAgeHours: 8 }, { enabled });

  const {
    hasNextPage,
    isFetchingNextPage,
    isLoading: clientsLoading,
    fetchNextPage,
  } = clientsQuery;

  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage || clientsLoading) return;
    void fetchNextPage();
  }, [enabled, hasNextPage, isFetchingNextPage, clientsLoading, fetchNextPage]);

  const allPoints = useMemo(() => {
    const points: VisualiserMapPoint[] = [];

    const branchPoints = branchToMapPoints(branchesQuery.data ?? []);
    points.push(...branchPoints);

    const orgHq = organisationHqPoint(orgQuery.data);
    if (orgHq && !points.some((p) => p.layer === 'hq')) {
      points.push(orgHq);
    }

    for (const marker of competitorsQuery.data ?? []) {
      const [lat, lng] = marker.position ?? [];
      const asList: CompetitorListItem = {
        uid: marker.id,
        name: marker.name,
        latitude: marker.latitude ?? lat,
        longitude: marker.longitude ?? lng,
        address: marker.address,
        contactPhone: marker.contactPhone,
        contactEmail: marker.contactEmail,
        logoUrl: marker.logoUrl,
        estimatedAnnualRevenue: marker.estimatedAnnualRevenue,
        status: marker.status,
        industry: marker.industry,
        threatLevel: marker.threatLevel,
        accountName: marker.accountName,
        LegalEntity: marker.LegalEntity,
        TradingName: marker.TradingName,
        isDirect: marker.isDirect,
      };
      const point = competitorToMapPoint(asList);
      if (point) points.push(point);
    }

    for (const client of clientsQuery.data ?? []) {
      const point = clientToMapPoint(client);
      if (point) points.push(point);
    }

    for (const loc of repsQuery.data?.locations ?? []) {
      const point = repLocationToMapPoint(loc);
      if (point) points.push(point);
    }

    return points;
  }, [
    branchesQuery.data,
    orgQuery.data,
    competitorsQuery.data,
    clientsQuery.data,
    repsQuery.data,
  ]);

  const visiblePoints = useMemo(
    () => allPoints.filter((p) => visibility[p.layer]),
    [allPoints, visibility]
  );

  const counts = useMemo(() => {
    const next: Record<VisualiserLayerId, number> = {
      branches: 0,
      hq: 0,
      clients: 0,
      competitors: 0,
      reps: 0,
    };
    for (const p of allPoints) next[p.layer] += 1;
    return next;
  }, [allPoints]);

  const isLoading =
    (enabled && branchesQuery.isLoading) ||
    (enabled && competitorsQuery.isLoading) ||
    (enabled && clientsQuery.isLoading) ||
    (enabled && repsQuery.isLoading);

  const isFetching =
    branchesQuery.isFetching ||
    competitorsQuery.isFetching ||
    clientsQuery.isFetching ||
    repsQuery.isFetching ||
    orgQuery.isFetching;

  return {
    allPoints,
    visiblePoints,
    counts,
    isLoading,
    isFetching,
    queries: {
      branchesQuery,
      orgQuery,
      competitorsQuery,
      clientsQuery,
      repsQuery,
    },
  };
}
