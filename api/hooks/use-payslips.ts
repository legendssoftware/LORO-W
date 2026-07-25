'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getPayslipDocument, getPayslips, getUserPayslips } from '@/api/endpoints/payslips';
import type { GetPayslipsParams } from '@/api/types/payslips';

export const PAYSLIPS_QUERY_KEY_PREFIX = ['payslips'] as const;

export type PayslipsListHookOptions = {
  enabled?: boolean;
  skipErrorToast?: boolean;
};

/**
 * Fetches paginated payslips list (GET /payslips).
 */
export function usePayslips(
  params: GetPayslipsParams = {},
  options?: PayslipsListHookOptions
) {
  const client = useApiClient();
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useQuery({
    queryKey: [...PAYSLIPS_QUERY_KEY_PREFIX, 'list', params],
    queryFn: async () => getPayslips(client, params, listOpts),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches payslips for the logged-in user (GET /payslips/user/:ref) — APK parity.
 */
export function useUserPayslips(
  userRef: number | string | null | undefined,
  options?: PayslipsListHookOptions
) {
  const client = useApiClient();
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useQuery({
    queryKey: [...PAYSLIPS_QUERY_KEY_PREFIX, 'user', userRef],
    queryFn: async () => {
      if (userRef == null || userRef === '') {
        throw new Error('User reference required');
      }
      return getUserPayslips(client, userRef, listOpts);
    },
    enabled: options?.enabled !== false && userRef != null && userRef !== '',
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Resolves a signed HTTPS URL for viewing or downloading a payslip PDF.
 */
export function usePayslipDocument(
  payslipId: number | null | undefined,
  options?: { enabled?: boolean; skipErrorToast?: boolean }
) {
  const client = useApiClient();
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useQuery({
    queryKey: [...PAYSLIPS_QUERY_KEY_PREFIX, 'document', payslipId],
    queryFn: async () => {
      if (payslipId == null) throw new Error('Payslip id required');
      return getPayslipDocument(client, payslipId, listOpts);
    },
    enabled: options?.enabled !== false && payslipId != null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
