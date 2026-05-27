'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getMapReport } from '@/api/endpoints/map';
import { mapReportQueryKey } from '@/api/hooks/use-map-report';
import type { SyncProfile } from '@/api/types';
import type { ReportsMode } from '@/app/reports/reports-mode';

function idleRun(fn: () => void): void {
  if (
    typeof requestIdleCallback !== 'undefined' &&
    typeof window !== 'undefined'
  ) {
    requestIdleCallback(() => fn(), { timeout: 2500 });
  } else {
    setTimeout(fn, 0);
  }
}

export function useVisualiserPrefetch(options: {
  enabled: boolean;
  reportsMode: ReportsMode;
  profile: SyncProfile | null | undefined;
}) {
  const { enabled, reportsMode, profile } = options;
  const queryClient = useQueryClient();
  const client = useApiClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      ranRef.current = false;
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    const mapParams =
      reportsMode === 'self' && profile?.uid != null
        ? {
            resolveMarkerAddresses: false as const,
            allTime: true as const,
            userId: profile.uid,
          }
        : {
            resolveMarkerAddresses: false as const,
            allTime: true as const,
          };

    const run = () => {
      void queryClient.prefetchQuery({
        queryKey: mapReportQueryKey(mapParams),
        queryFn: () => getMapReport(client, mapParams),
        staleTime: 60 * 1000,
      });
    };

    idleRun(run);
  }, [client, enabled, profile?.uid, queryClient, reportsMode]);
}
