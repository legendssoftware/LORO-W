'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createWarning,
  getUserWarnings,
  normalizeWarningsList,
  updateWarning,
} from '@/api/endpoints/warnings';
import type {
  CreateWarningPayload,
  UpdateWarningPayload,
  WarningRecord,
} from '@/api/types/warnings';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export const USER_WARNINGS_QUERY_KEY_PREFIX = ['warnings', 'user'] as const;

function userWarningsQueryKey(userRef: string | number) {
  return [...USER_WARNINGS_QUERY_KEY_PREFIX, String(userRef)] as const;
}

function isFeatureAccessError(err: unknown): boolean {
  if (getErrorStatus(err) !== 403) return false;
  const msg = getQueryErrorMessage(err, '').toLowerCase();
  return (
    msg.includes('plan') ||
    msg.includes('feature') ||
    msg.includes('subscription') ||
    msg.includes('upgrade') ||
    msg.includes('enterprise')
  );
}

/**
 * Formal HR warnings for a user (uid or clerkUserId).
 * Returns [] on enterprise 403 so the settings page stays usable.
 */
export function useUserWarnings(
  userRef: string | number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: userWarningsQueryKey(userRef ?? 'none'),
    queryFn: async (): Promise<WarningRecord[]> => {
      try {
        const res = await getUserWarnings(client, userRef!);
        return normalizeWarningsList(res);
      } catch (err) {
        if (isFeatureAccessError(err)) return [];
        throw err;
      }
    },
    enabled: (options?.enabled !== false) && userRef != null && userRef !== '',
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateWarningMutation(userRef: string | number | null | undefined) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWarningPayload) => createWarning(client, payload),
    onSuccess: (res) => {
      if (userRef != null) {
        queryClient.invalidateQueries({ queryKey: userWarningsQueryKey(userRef) });
      }
      queryClient.invalidateQueries({ queryKey: USER_WARNINGS_QUERY_KEY_PREFIX });
      toast.success(res.message || 'Warning issued');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to issue warning'));
    },
  });
}

export function useUpdateWarningMutation(userRef: string | number | null | undefined) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      warningUid,
      payload,
    }: {
      warningUid: number;
      payload: UpdateWarningPayload;
    }) => updateWarning(client, warningUid, payload),
    onSuccess: (res) => {
      if (userRef != null) {
        queryClient.invalidateQueries({ queryKey: userWarningsQueryKey(userRef) });
      }
      queryClient.invalidateQueries({ queryKey: USER_WARNINGS_QUERY_KEY_PREFIX });
      toast.success(res.message || 'Warning updated');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to update warning'));
    },
  });
}

/**
 * Revoke multiple warnings (selected only). Unselected records are untouched.
 */
export function useRevokeWarningsMutation(userRef: string | number | null | undefined) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (warningUids: number[]) => {
      const results = await Promise.allSettled(
        warningUids.map((uid) =>
          updateWarning(client, uid, { status: 'REVOKED', isExpired: true })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected');
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      if (failed.length > 0 && succeeded === 0) {
        const first = failed[0];
        throw first.status === 'rejected' ? first.reason : new Error('Failed to clear warnings');
      }
      return { succeeded, failed: failed.length };
    },
    onSuccess: (res) => {
      if (userRef != null) {
        queryClient.invalidateQueries({ queryKey: userWarningsQueryKey(userRef) });
      }
      queryClient.invalidateQueries({ queryKey: USER_WARNINGS_QUERY_KEY_PREFIX });
      if (res.failed > 0) {
        toast.success(
          `Cleared ${res.succeeded} warning${res.succeeded === 1 ? '' : 's'}; ${res.failed} failed`
        );
      } else {
        toast.success(
          `Cleared ${res.succeeded} warning${res.succeeded === 1 ? '' : 's'}`
        );
      }
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to clear warnings'));
    },
  });
}
