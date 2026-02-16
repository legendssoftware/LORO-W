'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getUserByRef,
  patchUser,
  type PatchUserBody,
  type UserResponse,
} from '@/api/endpoints/user';

const QUERY_KEY_PREFIX = ['user'] as const;

export function useUser(ref: string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, ref],
    queryFn: async () => {
      if (!ref) return null;
      const res = await getUserByRef(client, ref);
      return res.user;
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePatchUser(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PatchUserBody) => {
      if (!ref) throw new Error('User ref required');
      return patchUser(client, ref, body);
    },
    onSuccess: (_, __, ___) => {
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export type { UserResponse, PatchUserBody };
