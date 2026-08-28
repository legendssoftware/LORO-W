'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getCall, getCalls, retryCallTranscript, startCompanyCall, ensureCallAudio, rateCallConversation } from '@/api/endpoints/calls';
import type { CallRecordingDetailResponse, CallStartPayload, GetCallsParams } from '@/api/types/calls';

export const CALLS_QUERY_KEY_PREFIX = ['calls'] as const;

export function useCalls(params: GetCallsParams = {}, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...CALLS_QUERY_KEY_PREFIX, 'list', params],
    queryFn: () => getCalls(client, params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useCall(
  uid: string | null,
  options?: {
    enabled?: boolean;
    /** Poll every 2.5s while the dialog is open and transcription is queued or running. */
    pollWhileTranscribing?: boolean;
  },
) {
  const client = useApiClient();
  return useQuery<CallRecordingDetailResponse>({
    queryKey: [...CALLS_QUERY_KEY_PREFIX, 'detail', uid],
    queryFn: () => getCall(client, uid as string),
    enabled: Boolean(uid) && options?.enabled !== false,
    staleTime: 15 * 1000,
    refetchInterval: (query) => {
      if (!options?.pollWhileTranscribing) return false;
      const status = query.state.data?.call?.transcriptStatus;
      if (status === 'pending' || status === 'processing') return 2500;
      return false;
    },
  });
}

export function useRetryCallTranscriptMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => retryCallTranscript(client, uid),
    onSuccess: (_data, uid) => {
      void queryClient.invalidateQueries({ queryKey: CALLS_QUERY_KEY_PREFIX });
      void queryClient.invalidateQueries({ queryKey: [...CALLS_QUERY_KEY_PREFIX, 'detail', uid] });
    },
  });
}

export function useRateCallMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => rateCallConversation(client, uid),
    onSuccess: (data, uid) => {
      queryClient.setQueryData([...CALLS_QUERY_KEY_PREFIX, 'detail', uid], data);
      void queryClient.invalidateQueries({ queryKey: CALLS_QUERY_KEY_PREFIX });
    },
  });
}

export function useEnsureCallAudioMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => ensureCallAudio(client, uid),
    onSuccess: (data, uid) => {
      queryClient.setQueryData([...CALLS_QUERY_KEY_PREFIX, 'detail', uid], data);
      void queryClient.invalidateQueries({ queryKey: [...CALLS_QUERY_KEY_PREFIX, 'list'] });
    },
  });
}

export function useStartCompanyCallMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CallStartPayload) => startCompanyCall(client, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CALLS_QUERY_KEY_PREFIX });
    },
  });
}
