'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  exportPolicyReportCsv,
  finalisePolicyMonth,
  getPolicyReport,
} from '@/api/endpoints/performance-policy';
import type { PolicyReportParams } from '@/api/types/performance-policy';

export const PERFORMANCE_POLICY_REPORT_QUERY_KEY = ['performance-policy', 'report'] as const;

/** Closed windows never change until re-finalised, so they can be cached for much longer than live ones. */
const LIVE_STALE_MS = 60 * 1000;
const CLOSED_STALE_MS = 10 * 60 * 1000;

/**
 * GET /performance-policy/report. A 404 means the policy is not enabled for the organisation; callers treat
 * that as "feature off" rather than an error, so it is not retried.
 */
export function usePolicyReport(
  params: PolicyReportParams | null,
  options?: { enabled?: boolean; windowIsClosed?: boolean },
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...PERFORMANCE_POLICY_REPORT_QUERY_KEY, params] as const,
    queryFn: () => {
      if (!params) throw new Error('A window is required');
      return getPolicyReport(client, params);
    },
    enabled: options?.enabled !== false && params != null,
    staleTime: options?.windowIsClosed ? CLOSED_STALE_MS : LIVE_STALE_MS,
    gcTime: 10 * 60 * 1000,
    retry: false,
    placeholderData: (previous) => previous,
  });
}

/** Export the report as CSV text for the given filters. */
export function useExportPolicyReport() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (params: PolicyReportParams) => exportPolicyReportCsv(client, params),
  });
}

/** Freeze a closed month; refreshes every cached report afterwards. */
export function useFinalisePolicyMonth() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => finalisePolicyMonth(client, month),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_POLICY_REPORT_QUERY_KEY }),
  });
}
