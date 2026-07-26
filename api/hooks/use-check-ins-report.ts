'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getCheckInsDispatchSummary,
  getCheckInsReport,
  type GetCheckInsReportParams,
} from '@/api/endpoints/check-ins';
import type {
  CheckInsDispatchSummary,
  CheckInsReportResponse,
} from '@/api/types/reports';

export const CHECK_INS_DOMAIN_REPORT_QUERY_KEY = ['check-ins', 'report'] as const;
export const CHECK_INS_DISPATCH_SUMMARY_QUERY_KEY = [
  'check-ins',
  'dispatch-summary',
] as const;

/**
 * GET /check-ins/report — aggregated visit chart series.
 */
export function useCheckInsReport(
  params: GetCheckInsReportParams | null,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [
      ...CHECK_INS_DOMAIN_REPORT_QUERY_KEY,
      params?.from,
      params?.to,
    ] as const,
    queryFn: async (): Promise<CheckInsReportResponse> => {
      if (!params?.from || !params?.to) {
        throw new Error('from and to are required');
      }
      return getCheckInsReport(client, params);
    },
    enabled:
      options?.enabled !== false && !!params?.from && !!params?.to,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * GET /check-ins/dispatch-summary — planned vs completed visit plans.
 */
export function useCheckInsDispatchSummary(
  params: GetCheckInsReportParams | null,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [
      ...CHECK_INS_DISPATCH_SUMMARY_QUERY_KEY,
      params?.from,
      params?.to,
    ] as const,
    queryFn: async (): Promise<CheckInsDispatchSummary> => {
      if (!params?.from || !params?.to) {
        throw new Error('from and to are required');
      }
      return getCheckInsDispatchSummary(client, params);
    },
    enabled:
      options?.enabled !== false && !!params?.from && !!params?.to,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
