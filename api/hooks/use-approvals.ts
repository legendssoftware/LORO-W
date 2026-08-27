'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getApproval,
  getApprovals,
  getApprovalStats,
  performApprovalAction,
  type GetApprovalsParams,
} from '@/api/endpoints/approvals';
import toast from 'react-hot-toast';

export const APPROVALS_QUERY_KEY_PREFIX = ['approvals'] as const;

export function invalidateApprovalsQueries(
  queryClient: QueryClient,
  opts?: { detailUid?: number | null }
) {
  queryClient.invalidateQueries({ queryKey: [...APPROVALS_QUERY_KEY_PREFIX, 'list'] });
  queryClient.invalidateQueries({ queryKey: [...APPROVALS_QUERY_KEY_PREFIX, 'stats'] });
  if (opts?.detailUid != null) {
    queryClient.invalidateQueries({
      queryKey: [...APPROVALS_QUERY_KEY_PREFIX, 'detail', opts.detailUid],
    });
  }
}

export function useApprovals(
  params: GetApprovalsParams = {},
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...APPROVALS_QUERY_KEY_PREFIX, 'list', params],
    queryFn: () => getApprovals(client, params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  });
}

export function useApproval(uid: number | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...APPROVALS_QUERY_KEY_PREFIX, 'detail', uid],
    queryFn: () => getApproval(client, uid as number),
    enabled: options?.enabled !== false && uid != null,
    staleTime: 15 * 1000,
  });
}

export function useApprovalStats(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...APPROVALS_QUERY_KEY_PREFIX, 'stats'],
    queryFn: () => getApprovalStats(client),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  });
}

export function usePerformApprovalAction() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      uid: number;
      action: 'approve' | 'reject';
      comments?: string;
      reason?: string;
    }) =>
      performApprovalAction(client, input.uid, {
        action: input.action,
        comments: input.comments,
        reason: input.reason,
      }),
    onSuccess: (_data, variables) => {
      invalidateApprovalsQueries(queryClient, { detailUid: variables.uid });
      toast.success(
        variables.action === 'approve' ? 'Approval granted' : 'Approval rejected'
      );
    },
  });
}
