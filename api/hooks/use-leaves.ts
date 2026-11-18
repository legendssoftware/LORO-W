'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  approveLeave,
  cancelLeave,
  createLeave,
  deleteLeave,
  getLeave,
  getLeaveList,
  getLeaveReport,
  getLeavesByUser,
  rejectLeave,
  type GetLeaveListParams,
} from '@/api/endpoints/leave';
import type { CreateLeavePayload, LeaveRecord } from '@/api/types/leave';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';

const QUERY_KEY = ['leave', 'user'] as const;
export const LEAVE_QUERY_KEY = ['leave'] as const;

function invalidateLeaveQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: LEAVE_QUERY_KEY });
}

function toastLeaveError(error: unknown, fallback: string) {
  const message = getQueryErrorMessage(error, fallback);
  if (getErrorStatus(error) === 403 && !message.toLowerCase().includes('leave')) {
    toast.error(`${message} Leave may not be enabled for this organisation.`);
    return;
  }
  toast.error(message);
}

/**
 * Fetches leave history for a user (requires clerkUserId).
 * Leave module is enterprise-only; the query errors on 403 and the caller can show an empty state.
 */
export function useLeaves(clerkUserId: string | null | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY, clerkUserId ?? 'none'],
    queryFn: async () => {
      const res = await getLeavesByUser(client, clerkUserId!);
      return res.leaves as LeaveRecord[];
    },
    enabled: options?.enabled !== false && !!clerkUserId,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/** GET /leave with status and date filters. */
export function useLeaveList(params: GetLeaveListParams, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...LEAVE_QUERY_KEY, 'list', params],
    queryFn: () => getLeaveList(client, params),
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
}

/** GET /leave/user/:ref. Used when the inbox is filtered to one person. */
export function useLeaveHistory(ref: string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...LEAVE_QUERY_KEY, 'history', ref ?? 'none'],
    queryFn: () => getLeavesByUser(client, ref!),
    enabled: options?.enabled !== false && !!ref,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
}

/** GET /leave/:ref. */
export function useLeave(ref: number | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...LEAVE_QUERY_KEY, 'detail', ref],
    queryFn: () => getLeave(client, ref!),
    enabled: options?.enabled !== false && ref != null,
    staleTime: 15 * 1000,
  });
}

/** GET /leave/report for the selected date window. */
export function useLeaveReport(
  params: { from?: string; to?: string },
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const ready = Boolean(params.from && params.to);
  return useQuery({
    queryKey: [...LEAVE_QUERY_KEY, 'report', params.from ?? '', params.to ?? ''],
    queryFn: () => getLeaveReport(client, { from: params.from!, to: params.to! }),
    enabled: options?.enabled !== false && ready,
    staleTime: 60 * 1000,
  });
}

export function useCreateLeaveMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLeavePayload) => createLeave(client, body),
    onSuccess: (result) => {
      toast.success(result.message || 'Leave request created');
      invalidateLeaveQueries(queryClient);
    },
    onError: (error) => toastLeaveError(error, 'Could not request leave'),
  });
}

export function useApproveLeaveMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => approveLeave(client, ref),
    onSuccess: (result) => {
      toast.success(result.message || 'Leave request approved');
      invalidateLeaveQueries(queryClient);
    },
    onError: (error) => toastLeaveError(error, 'Could not approve leave'),
  });
}

export function useRejectLeaveMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ref: number; rejectionReason: string }) =>
      rejectLeave(client, input.ref, input.rejectionReason),
    onSuccess: (result) => {
      toast.success(result.message || 'Leave request rejected');
      invalidateLeaveQueries(queryClient);
    },
    onError: (error) => toastLeaveError(error, 'Could not reject leave'),
  });
}

export function useCancelLeaveMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ref: number; cancellationReason: string }) =>
      cancelLeave(client, input.ref, input.cancellationReason),
    onSuccess: (result) => {
      toast.success(result.message || 'Leave request cancelled');
      invalidateLeaveQueries(queryClient);
    },
    onError: (error) => toastLeaveError(error, 'Could not cancel leave'),
  });
}

export function useDeleteLeaveMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => deleteLeave(client, ref),
    onSuccess: (result) => {
      toast.success(result.message || 'Leave request deleted');
      invalidateLeaveQueries(queryClient);
    },
    onError: (error) => toastLeaveError(error, 'Could not delete leave'),
  });
}
