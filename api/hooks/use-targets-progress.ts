'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getTargetsProgress,
  type GetTargetsProgressParams,
} from '@/api/endpoints/targets-progress';
import type { TargetsProgressData } from '@/api/types/targets-progress';

const QUERY_KEY = ['reports', 'targets-progress'] as const;

export function targetsProgressQueryKey(
  params: GetTargetsProgressParams | undefined
) {
  return [
    ...QUERY_KEY,
    params?.from ?? null,
    params?.to ?? null,
    params?.bucket ?? null,
    params?.organisationId ?? null,
    params?.branchId ?? null,
    params?.userUid ?? null,
  ] as const;
}

export function useTargetsProgress(
  params: GetTargetsProgressParams | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: targetsProgressQueryKey(params),
    queryFn: async (): Promise<TargetsProgressData> => {
      if (!params?.from || !params?.to) {
        throw new Error('from and to are required');
      }
      return getTargetsProgress(client, params);
    },
    enabled:
      options?.enabled !== false &&
      Boolean(params?.from && params?.to),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
