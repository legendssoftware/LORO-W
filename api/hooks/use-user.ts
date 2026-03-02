'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getUserByRef,
  patchUser,
  deleteUser,
  restoreUser,
  deleteUserPermanently,
  getUserTarget,
  patchUserTarget,
  getUserPreferences,
  type PatchUserBody,
  type PatchUserTargetBody,
  type UserResponse,
} from '@/api/endpoints/user';

const QUERY_KEY_PREFIX = ['user'] as const;
const TARGET_QUERY_KEY_PREFIX = ['user', 'target'] as const;

export function useUser(
  ref: string | null,
  options?: { enabled?: boolean; includeDeleted?: boolean; includeAssignedClients?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, ref, options?.includeDeleted ?? false, options?.includeAssignedClients],
    queryFn: async () => {
      if (!ref) return null;
      const res = await getUserByRef(client, ref, {
        includeDeleted: options?.includeDeleted,
        includeAssignedClients: options?.includeAssignedClients,
      });
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

export function useDeleteUser(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return deleteUser(client, ref);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_PREFIX });
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useRestoreUser(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return restoreUser(client, ref);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_PREFIX });
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useDeleteUserPermanently(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return deleteUserPermanently(client, ref);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_PREFIX });
      if (ref) {
        queryClient.removeQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useUserTarget(ref: string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TARGET_QUERY_KEY_PREFIX, ref],
    queryFn: async () => {
      if (!ref) return { userTarget: null, message: '' };
      const res = await getUserTarget(client, ref);
      return res;
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

const PREFERENCES_QUERY_KEY_PREFIX = ['user', 'preferences'] as const;

export function useUserPreferences(ref: string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...PREFERENCES_QUERY_KEY_PREFIX, ref],
    queryFn: async () => {
      if (!ref) return { preferences: {}, message: '' };
      return getUserPreferences(client, ref);
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePatchUserTarget(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PatchUserTargetBody) => {
      if (!ref) throw new Error('User ref required');
      return patchUserTarget(client, ref, body);
    },
    onSuccess: (_, __, ___) => {
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
        queryClient.invalidateQueries({ queryKey: [...TARGET_QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export type { UserResponse, PatchUserBody, PatchUserTargetBody };
