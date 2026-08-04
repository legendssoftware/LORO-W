'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { createAsset, getAssetsByUser } from '@/api/endpoints/assets';
import type { AssetRecord, CreateAssetPayload } from '@/api/types/asset';
import toast from 'react-hot-toast';
import { getQueryErrorMessage } from '@/lib/api/query-error';

export const ASSETS_QUERY_KEY_PREFIX = ['assets'] as const;

export function useUserVehicleAssets(
  userUid: number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user', userUid],
    queryFn: async () => {
      if (userUid == null) return [] as AssetRecord[];
      const res = await getAssetsByUser(client, userUid);
      return (res.assets ?? []).filter((a) => a.category === 'VEHICLE');
    },
    enabled: options?.enabled !== false && userUid != null && userUid > 0,
    staleTime: 60 * 1000,
  });
}

export function useCreateAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(client, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY_PREFIX });
      toast.success('Vehicle added');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to add vehicle'));
    },
  });
}
