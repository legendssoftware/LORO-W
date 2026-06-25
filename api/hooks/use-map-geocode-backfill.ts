'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  postMapGeocodeBackfill,
  type MapGeocodeBackfillParams,
} from '@/api/endpoints/map';
import { mapReportQueryKey } from '@/api/hooks/use-map-report';
import { COMPETITORS_QUERY_KEY_PREFIX } from '@/api/hooks/use-competitors';
import type { MapDataResponse } from '@/api/types/map';

export function useMapGeocodeBackfillMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params?: MapGeocodeBackfillParams) =>
      postMapGeocodeBackfill(client, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports', 'map'] });
      void queryClient.invalidateQueries({ queryKey: ['reports', 'competitor-map-markers'] });
      void queryClient.invalidateQueries({ queryKey: ['reports', 'branch-map-markers'] });
      void queryClient.invalidateQueries({ queryKey: [...COMPETITORS_QUERY_KEY_PREFIX] });
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      void queryClient.invalidateQueries({ queryKey: siteOpportunitiesQueryKeyPrefix });
    },
  });
}

const siteOpportunitiesQueryKeyPrefix = ['reports', 'site-opportunities'] as const;

export function totalCappedPending(
  summary: MapDataResponse['geocodingSummary'] | null | undefined
): number {
  if (!summary) return 0;
  return (
    (summary.clients?.cappedPending ?? 0) +
    (summary.competitors?.cappedPending ?? 0) +
    (summary.branches?.cappedPending ?? 0)
  );
}

export function totalAlreadyExhausted(
  summary: MapDataResponse['geocodingSummary'] | null | undefined
): number {
  if (!summary) return 0;
  return (
    (summary.clients?.alreadyExhausted ?? 0) +
    (summary.competitors?.alreadyExhausted ?? 0) +
    (summary.branches?.alreadyExhausted ?? 0)
  );
}

/** True when map load hit the per-request geocode cap — run backfill manually or via CLI. */
export function needsMapGeocodeBackfill(
  summary: MapDataResponse['geocodingSummary'] | null | undefined
): boolean {
  return totalCappedPending(summary) > 0;
}

export function totalCompetitorBranchCappedPending(
  summary: MapDataResponse['geocodingSummary'] | null | undefined
): number {
  if (!summary) return 0;
  return (summary.branches?.cappedPending ?? 0) + (summary.competitors?.cappedPending ?? 0);
}

export function totalCompetitorBranchAlreadyExhausted(
  summary: MapDataResponse['geocodingSummary'] | null | undefined
): number {
  if (!summary) return 0;
  return (
    (summary.branches?.alreadyExhausted ?? 0) + (summary.competitors?.alreadyExhausted ?? 0)
  );
}

/** Competitors and branches only — auto-backfill when cap left pending rows (not when already exhausted). */
export function needsCompetitorBranchGeocodeBackfill(
  summary: MapDataResponse['geocodingSummary'] | null | undefined
): boolean {
  return totalCompetitorBranchCappedPending(summary) > 0;
}

/** Re-export map report key helper for callers invalidating after backfill. */
export { mapReportQueryKey };
