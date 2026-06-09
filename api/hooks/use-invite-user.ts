'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { DAILY_OVERVIEW_QUERY_KEY_PREFIX } from '@/api/hooks/use-daily-overview';
import {
  inviteUser,
  provisionUser,
  reInviteUser,
  type InviteUserBody,
} from '@/api/endpoints/user';

const USER_QUERY_KEY_PREFIX = ['user'] as const;
const USERS_QUERY_KEY_PREFIX = ['users'] as const;

export function useInviteUserMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: InviteUserBody) => inviteUser(client, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY_PREFIX });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY_PREFIX });
      queryClient.invalidateQueries({ queryKey: DAILY_OVERVIEW_QUERY_KEY_PREFIX });
    },
  });
}

export function useProvisionUserMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number | string) => provisionUser(client, userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY_PREFIX });
      queryClient.invalidateQueries({ queryKey: [...USER_QUERY_KEY_PREFIX, String(userId)] });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY_PREFIX });
      queryClient.invalidateQueries({ queryKey: DAILY_OVERVIEW_QUERY_KEY_PREFIX });
    },
  });
}

export function useReInviteUserMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number | string) => reInviteUser(client, userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: [...USER_QUERY_KEY_PREFIX, String(userId)] });
    },
  });
}
