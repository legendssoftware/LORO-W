'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getCheckIns,
  getCheckInsReport,
  type GetCheckInsParams,
  type GetCheckInsReportParams,
} from '@/api/endpoints/check-ins';
import type {
  CheckInsListResponse,
  DomainReportResponse,
} from '@/api/types/reports';

const CHECK_INS_KEY_PREFIX = ['check-ins', 'list'] as const;
const CHECK_INS_REPORT_KEY_PREFIX = ['check-ins', 'report'] as const;

/**
 * Fetches check-ins (visits) with optional user and date range.
 * Server returns checkInTime DESC; do not re-sort for export parity.
 */
export function useCheckIns(
  params: GetCheckInsParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...CHECK_INS_KEY_PREFIX, params],
    queryFn: async (): Promise<CheckInsListResponse> => {
      return getCheckIns(client, params);
    },
    enabled: options?.enabled !== false,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches check-ins report (total, byDay) for date range.
 */
export function useCheckInsReport(
  params: GetCheckInsReportParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...CHECK_INS_REPORT_KEY_PREFIX, params],
    queryFn: async (): Promise<DomainReportResponse> => {
      return getCheckInsReport(client, params);
    },
    enabled: options?.enabled !== false && !!params.from && !!params.to,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
