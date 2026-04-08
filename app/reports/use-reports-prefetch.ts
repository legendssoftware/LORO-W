'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { endOfDay, format, startOfDay } from 'date-fns';
import { useApiClient } from '@/api/hooks/use-api-client';
import { BRANCHES_QUERY_KEY } from '@/api/hooks/use-branches';
import { getBranches } from '@/api/endpoints/branch';
import { getTargetsProgress } from '@/api/endpoints/targets-progress';
import { targetsProgressQueryKey } from '@/api/hooks/use-targets-progress';
import { getUsers } from '@/api/endpoints/user';
import { usersListQueryKey } from '@/api/hooks/use-users';
import { prefetchCheckInsList } from '@/api/hooks/use-check-ins';
import { getLeadsReport } from '@/api/endpoints/leads';
import { leadsReportQueryKey } from '@/api/hooks/use-leads';
import { getMapReport } from '@/api/endpoints/map';
import { mapReportQueryKey } from '@/api/hooks/use-map-report';
import type { SyncProfile } from '@/api/types';
import { isReportsElevatedViewer } from '@/lib/access';

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function utcToday(): Date {
  const n = new Date();
  return new Date(
    Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
  );
}

function getUtcMonthRange(ref: Date): { from: string; to: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m, lastDay));
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

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

export function useReportsPrefetch(options: {
  enabled: boolean;
  reportsMode: 'org' | 'self';
  profile: SyncProfile | null | undefined;
}) {
  const { enabled, reportsMode, profile } = options;
  const queryClient = useQueryClient();
  const client = useApiClient();
  const { getToken } = useAuth();
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
      const { from, to } = getUtcMonthRange(utcToday());
      const todayLocal = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const startIso = startOfDay(new Date()).toISOString();
      const endIso = endOfDay(new Date()).toISOString();

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
          queryKey: targetsProgressQueryKey({
            from,
            to,
            bucket: 'day',
          }),
          queryFn: () =>
            getTargetsProgress(client, { from, to, bucket: 'day' }),
          staleTime: 60 * 1000,
        }),
        ...(elevated
          ? [
              queryClient.prefetchQuery({
                queryKey: usersListQueryKey({
                  page: 1,
                  limit: 250,
                  search: '',
                  branchId: undefined,
                }),
                queryFn: async () => {
                  const res = await getUsers(client, {
                    page: 1,
                    limit: 250,
                  });
                  return Array.isArray(res?.data) ? res.data : [];
                },
                staleTime: 2 * 60 * 1000,
              }),
            ]
          : []),
      ]);

      await new Promise<void>((resolve) => idleRun(resolve));

      const checkInsParams =
        reportsMode === 'self' && profile?.uid != null
          ? {
              startDate: startIso,
              endDate: endIso,
              userUid: String(profile.uid),
            }
          : { startDate: startIso, endDate: endIso };

      await prefetchCheckInsList(queryClient, getToken, checkInsParams);

      await new Promise<void>((resolve) => idleRun(resolve));

      const leadsParams = {
        from: todayLocal,
        to: todayLocal,
        dateBasis: 'activity' as const,
      };
      await queryClient.prefetchQuery({
        queryKey: leadsReportQueryKey(leadsParams),
        queryFn: () => getLeadsReport(client, leadsParams),
        staleTime: 5 * 60 * 1000,
      });

      await new Promise<void>((resolve) => idleRun(resolve));

      const mapParams =
        reportsMode === 'self' && profile?.uid != null
          ? {
              startDate: startIso,
              endDate: endIso,
              resolveMarkerAddresses: false as const,
              userId: profile.uid,
            }
          : {
              startDate: startIso,
              endDate: endIso,
              resolveMarkerAddresses: false as const,
            };

      await queryClient.prefetchQuery({
        queryKey: mapReportQueryKey(mapParams),
        queryFn: () => getMapReport(client, mapParams),
        staleTime: 60 * 1000,
      });
    };

    void run().catch(() => {
      /* prefetch is best-effort */
    });
  }, [
    client,
    elevated,
    enabled,
    getToken,
    profile?.uid,
    queryClient,
    reportsMode,
  ]);
}
