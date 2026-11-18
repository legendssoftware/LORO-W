'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  approveLeave,
  cancelLeave,
  createLeave,
  deleteLeave,
  getLeaveInbox,
  getLeaveReport,
  getLeavesByUser,
  rejectLeave,
} from '@/api/endpoints/leave';
import type { CreateLeavePayload, LeaveListFilters, LeaveRecord } from '@/api/types/leave';

const QUERY_KEY = ['leave', 'user'] as const;
export const LEAVE_INBOX_QUERY_KEY = ['leave', 'inbox'] as const;

/**
 * Fetches leave history for a user (requires clerkUserId).
 * Leave module is enterprise-only; returns empty array on 403.
 */
export function useLeaves(clerkUserId: string | null | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY, clerkUserId ?? 'none'],
    queryFn: async () => {
      const res = await getLeavesByUser(client, clerkUserId!);
      return res.leaves as LeaveRecord[];
    },
    enabled: (options?.enabled !== false) && !!clerkUserId,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/** Organisation leave inbox. Own-row filtering is done by the page. */
export function useLeaveInbox(params: LeaveListFilters, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...LEAVE_INBOX_QUERY_KEY, params],
    queryFn: () => getLeaveInbox(client, params),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

export function useLeaveReport(from: string, to: string, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...LEAVE_INBOX_QUERY_KEY, 'report', from, to],
    queryFn: () => getLeaveReport(client, from, to),
    enabled: options?.enabled !== false && Boolean(from && to),
    staleTime: 60 * 1000,
  });
}

function useLeaveMutation<TVariables>(
  mutationFn: (client: ReturnType<typeof useApiClient>, variables: TVariables) => Promise<unknown>
) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(client, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

export function useCreateLeaveMutation() {
  return useLeaveMutation((client, payload: CreateLeavePayload) => createLeave(client, payload));
}

export function useApproveLeaveMutation() {
  return useLeaveMutation((client, ref: number) => approveLeave(client, ref));
}

export function useRejectLeaveMutation() {
  return useLeaveMutation((client, input: { ref: number; rejectionReason: string }) =>
    rejectLeave(client, input.ref, input.rejectionReason)
  );
}

export function useCancelLeaveMutation() {
  return useLeaveMutation((client, input: { ref: number; cancellationReason: string }) =>
    cancelLeave(client, input.ref, input.cancellationReason)
  );
}

export function useDeleteLeaveMutation() {
  return useLeaveMutation((client, ref: number) => deleteLeave(client, ref));
}
