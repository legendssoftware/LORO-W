'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { useApiClient } from '@/api/hooks/use-api-client';
import { BRANCHES_QUERY_KEY } from '@/api/hooks/use-branches';
import { getBranches } from '@/api/endpoints/branch';
import { getTargetsProgress } from '@/api/endpoints/targets-progress';
import { targetsProgressQueryKey } from '@/api/hooks/use-targets-progress';
import { getUsers } from '@/api/endpoints/user';
import { usersListQueryKey } from '@/api/hooks/use-users';
import { getLeadsReport } from '@/api/endpoints/leads';
import { leadsReportQueryKey } from '@/api/hooks/use-leads';
import { getMapReport } from '@/api/endpoints/map';
import { mapReportQueryKey } from '@/api/hooks/use-map-report';
import type { SyncProfile } from '@/api/types';
import { isReportsElevatedViewer } from '@/lib/access';
import {
  formatUtcYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';

const REPORTS_USERS_LIST_OPTIONS = {
  page: 1,
  limit: 250,
  search: '',
  branchId: undefined as number | undefined,
};

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

/** Same default range/bucket as Reports Overview tab (month-to-date, daily buckets). */
export function getReportsOverviewPrefetchParams() {
  const mtd = utcMonthStartThroughToday();
  const from = formatUtcYmd(mtd.start);
  const to = formatUtcYmd(mtd.end);
  const todayYmd = formatUtcYmd(utcToday());
  return {
    from,
    to,
    todayYmd,
    mtd,
    progressParams: { from, to, bucket: 'day' as const },
  };
}

/**
 * Warms cache for non-Overview tabs (map, leads). Call on tab hover/focus.
 */
export function prefetchReportsSecondaryTabs(
  queryClient: QueryClient,
  client: AxiosInstance,
  options: {
    reportsMode: 'org' | 'self';
    profile: SyncProfile | null | undefined;
  }
): void {
  const { reportsMode, profile } = options;
  const { todayYmd } = getReportsOverviewPrefetchParams();

  void queryClient.prefetchQuery({
    queryKey: leadsReportQueryKey({
      from: todayYmd,
      to: todayYmd,
      dateBasis: 'activity' as const,
    }),
    queryFn: () =>
      getLeadsReport(client, {
        from: todayYmd,
        to: todayYmd,
        dateBasis: 'activity',
      }),
    staleTime: 5 * 60 * 1000,
  });

  const mapParams =
    reportsMode === 'self' && profile?.uid != null
      ? {
          resolveMarkerAddresses: false as const,
          userId: profile.uid,
        }
      : {
          resolveMarkerAddresses: false as const,
        };

  void queryClient.prefetchQuery({
    queryKey: mapReportQueryKey(mapParams),
    queryFn: () => getMapReport(client, mapParams),
    staleTime: 60 * 1000,
  });
}

export function useReportsPrefetch(options: {
  enabled: boolean;
  reportsMode: 'org' | 'self';
  profile: SyncProfile | null | undefined;
}) {
  const { enabled, reportsMode, profile } = options;
  const queryClient = useQueryClient();
  const client = useApiClient();
  const ranRef = useRef(false);

  const elevated =
    isReportsElevatedViewer(profile?.accessLevel as string | undefined) &&
    reportsMode === 'org';

  useEffect(() => {
    if (!enabled) {
      ranRef.current = false;
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      const { progressParams } = getReportsOverviewPrefetchParams();

      await new Promise<void>((resolve) => idleRun(resolve));

      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: BRANCHES_QUERY_KEY,
          queryFn: async () => {
            const res = await getBranches(client);
            return res.branches ?? [];
          },
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: targetsProgressQueryKey(progressParams),
          queryFn: () => getTargetsProgress(client, progressParams),
          staleTime: 60 * 1000,
        }),
        ...(elevated
          ? [
              queryClient.prefetchQuery({
                queryKey: usersListQueryKey(REPORTS_USERS_LIST_OPTIONS),
                queryFn: async () => {
                  const res = await getUsers(client, {
                    page: REPORTS_USERS_LIST_OPTIONS.page,
                    limit: REPORTS_USERS_LIST_OPTIONS.limit,
                  });
                  return Array.isArray(res?.data) ? res.data : [];
                },
                staleTime: 2 * 60 * 1000,
              }),
            ]
          : []),
      ]);
    };

    void run().catch(() => {
      /* prefetch is best-effort */
    });
  }, [client, elevated, enabled, profile?.uid, queryClient, reportsMode]);
}
