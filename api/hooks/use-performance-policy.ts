'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  acknowledgePolicy,
  advancePerformanceCase,
  createWeeklyReview,
  decidePolicyException,
  exportPolicyReportCsv,
  finalisePolicyMonth,
  getCustomerMap,
  getMarketIntelStock,
  getMyAcknowledgement,
  getMyAgreement,
  getPolicyReport,
  getUserAgreement,
  getVerificationQueue,
  listPerformanceCases,
  listPolicyExceptions,
  listWeeklyReviews,
  openPerformanceCase,
  signMyAgreement,
  signWeeklyReview,
  updateWeeklyReview,
  upsertUserAgreement,
} from '@/api/endpoints/performance-policy';
import type { PolicyReportParams } from '@/api/types/performance-policy';

export const PERFORMANCE_POLICY_REPORT_QUERY_KEY = ['performance-policy', 'report'] as const;

/** Closed windows never change until re-finalised, so they can be cached for much longer than live ones. */
const LIVE_STALE_MS = 60 * 1000;
const CLOSED_STALE_MS = 10 * 60 * 1000;

/**
 * GET /performance-policy/report. A 404 means the policy is not enabled for the organisation; callers treat
 * that as "feature off" rather than an error, so it is not retried.
 */
export function usePolicyReport(
  params: PolicyReportParams | null,
  options?: { enabled?: boolean; windowIsClosed?: boolean },
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...PERFORMANCE_POLICY_REPORT_QUERY_KEY, params] as const,
    queryFn: () => {
      if (!params) throw new Error('A window is required');
      return getPolicyReport(client, params);
    },
    enabled: options?.enabled !== false && params != null,
    staleTime: options?.windowIsClosed ? CLOSED_STALE_MS : LIVE_STALE_MS,
    gcTime: 10 * 60 * 1000,
    retry: false,
    placeholderData: (previous) => previous,
  });
}

/** Export the report as CSV text for the given filters. */
export function useExportPolicyReport() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (params: PolicyReportParams) => exportPolicyReportCsv(client, params),
  });
}

/** Freeze a closed month; refreshes every cached report afterwards. */
export function useFinalisePolicyMonth() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => finalisePolicyMonth(client, month),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_POLICY_REPORT_QUERY_KEY }),
  });
}

/** Flagged and incomplete visits for the caller's team. 404 means the policy is off. */
export function useVerificationQueue(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'verification-queue', 'week'],
    queryFn: () => getVerificationQueue(client, { range: 'week' }),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useMyAcknowledgement(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'acknowledgement'],
    queryFn: () => getMyAcknowledgement(client),
    enabled,
    retry: false,
  });
}

export function useAcknowledgePolicy() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { itemsAccepted: string[]; typedName: string }) => acknowledgePolicy(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy', 'acknowledgement'] }),
  });
}

export function useMyAgreement(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'agreement', 'me'],
    queryFn: () => getMyAgreement(client),
    enabled,
    retry: false,
  });
}

export function useSignMyAgreement() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => signMyAgreement(client),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy'] }),
  });
}

export function useUserAgreement(clerkUserId: string | null, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'agreement', clerkUserId],
    queryFn: () => getUserAgreement(client, clerkUserId as string),
    enabled: enabled && Boolean(clerkUserId),
    retry: false,
  });
}

export function useUpsertAgreement(clerkUserId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { participates: boolean; prr?: number; currency?: string; effectiveDate?: string; witnessTypedName?: string }) =>
      upsertUserAgreement(client, clerkUserId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy'] }),
  });
}

export function usePolicyExceptions(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'exceptions'],
    queryFn: () => listPolicyExceptions(client, { status: 'pending' }),
    enabled,
    retry: false,
  });
}

export function useDecidePolicyException() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uid: number; outcome: 'approve' | 'reject'; decision?: string; decisionNote?: string }) =>
      decidePolicyException(client, input.uid, {
        outcome: input.outcome,
        ...(input.decision ? { decision: input.decision } : {}),
        ...(input.decisionNote ? { decisionNote: input.decisionNote } : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy'] }),
  });
}

export function useCustomerMap(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'customer-map'],
    queryFn: () => getCustomerMap(client),
    enabled,
    retry: false,
  });
}

export function useMarketIntelStock(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'market-intel'],
    queryFn: () => getMarketIntelStock(client),
    enabled,
    retry: false,
  });
}

export function useWeeklyReviews(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'reviews'],
    queryFn: () => listWeeklyReviews(client),
    enabled,
    retry: false,
  });
}

export function useCreateWeeklyReview() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { userClerkUserId: string; weekStart: string }) => createWeeklyReview(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy', 'reviews'] }),
  });
}

export function useUpdateWeeklyReview() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uid: number; body: Parameters<typeof updateWeeklyReview>[2] }) =>
      updateWeeklyReview(client, input.uid, input.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy', 'reviews'] }),
  });
}

export function useSignWeeklyReview() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uid: number; role: 'employee' | 'manager'; typedName: string; employeeComments?: string }) =>
      signWeeklyReview(client, input.uid, input.role, {
        typedName: input.typedName,
        ...(input.employeeComments ? { employeeComments: input.employeeComments } : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy', 'reviews'] }),
  });
}

export function usePerformanceCases(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['performance-policy', 'cases'],
    queryFn: () => listPerformanceCases(client),
    enabled,
    retry: false,
  });
}

export function useOpenPerformanceCase() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { userClerkUserId: string; reviewUid?: number; note?: string }) => openPerformanceCase(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy', 'cases'] }),
  });
}

export function useAdvancePerformanceCase() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uid: number; stage: 'coaching' | 'pip' | 'formal_review' | 'further_action' | 'closed'; note?: string }) =>
      advancePerformanceCase(client, input.uid, { stage: input.stage, note: input.note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-policy', 'cases'] }),
  });
}
