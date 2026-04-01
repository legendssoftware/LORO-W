'use client';

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getLeads,
  getUnassignedLeads,
  getLeadsForUser,
  getLeadsReport,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  restoreLead,
  reactivateLead,
  reassignLeads,
  getEngageDraft,
  sendLeadEngage,
  importLeadsFromCSV,
  dedupeLeads,
} from '@/api/endpoints/leads';
import type {
  GetLeadsParams,
  GetLeadsReportParams,
  GetUnassignedLeadsParams,
  GetLeadsForUserParams,
  CreateLeadPayload,
  UpdateLeadPayload,
  ReassignLeadsPayload,
  EngageDraftParams,
} from '@/api/types/leads';
import type { ImportLeadsFromCSVParams } from '@/api/endpoints/leads';

/** Query key prefix for leads. Use for invalidateQueries after create, import, or other lead mutations. */
export const LEADS_QUERY_KEY_PREFIX = ['leads'] as const;

/** Matches server default/max page size for list endpoints when omitted. */
export const LEADS_LIST_PAGE_SIZE = 100;

const QUERY_KEY_PREFIX = LEADS_QUERY_KEY_PREFIX;

export type LeadsListHookOptions = {
  enabled?: boolean;
  /** Skip global Axios error toast; use inline error UI (e.g. leads page banner). */
  skipErrorToast?: boolean;
};

function getNextLeadsPageParam(lastPage: { meta?: { page?: number; totalPages?: number } }): number | undefined {
  const m = lastPage?.meta;
  if (m == null || typeof m.page !== 'number' || typeof m.totalPages !== 'number') return undefined;
  return m.page < m.totalPages ? m.page + 1 : undefined;
}

/** Invalidates list, unassigned, report, grouped keys, and optional detail ref. */
export function invalidateLeadQueries(
  queryClient: QueryClient,
  opts?: { detailRef?: number }
) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY_PREFIX });
  if (opts?.detailRef != null) {
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEY_PREFIX, 'detail', opts.detailRef],
    });
  }
}

/**
 * Fetches paginated leads list.
 * Pass `scope: 'all'` (admin/owner) or `scope: 'me'` (default) — see GET /leads.
 */
export function useLeads(
  params: GetLeadsParams = {},
  options?: LeadsListHookOptions
) {
  const client = useApiClient();
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'list', params],
    queryFn: async () => getLeads(client, params, listOpts),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Unassigned leads (GET /leads/unassigned) with shared list filters.
 */
export function useUnassignedLeads(
  params: GetUnassignedLeadsParams = {},
  options?: LeadsListHookOptions
) {
  const client = useApiClient();
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'unassigned', params],
    queryFn: async () => getUnassignedLeads(client, params, listOpts),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export type GetLeadsInfiniteParams = Omit<GetLeadsParams, 'page'>;

/**
 * Paginated GET /leads with Load more — 100 rows per request by default.
 */
export function useLeadsInfinite(
  params: GetLeadsInfiniteParams = {},
  options?: LeadsListHookOptions
) {
  const client = useApiClient();
  const limit = params.limit ?? LEADS_LIST_PAGE_SIZE;
  const listParams = { ...params, limit };
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useInfiniteQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'list', 'infinite', listParams],
    queryFn: async ({ pageParam }) =>
      getLeads(client, { ...listParams, page: pageParam as number }, listOpts),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextLeadsPageParam(lastPage),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export type GetUnassignedLeadsInfiniteParams = Omit<GetUnassignedLeadsParams, 'page'>;

/**
 * Paginated GET /leads/unassigned with Load more — 100 rows per request by default.
 */
export function useUnassignedLeadsInfinite(
  params: GetUnassignedLeadsInfiniteParams = {},
  options?: LeadsListHookOptions
) {
  const client = useApiClient();
  const limit = params.limit ?? LEADS_LIST_PAGE_SIZE;
  const listParams = { ...params, limit };
  const listOpts = options?.skipErrorToast ? { skipErrorToast: true as const } : undefined;
  return useInfiniteQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'unassigned', 'infinite', listParams],
    queryFn: async ({ pageParam }) =>
      getUnassignedLeads(client, { ...listParams, page: pageParam as number }, listOpts),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextLeadsPageParam(lastPage),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches leads for the authenticated user (owner or assignee) with stats and pagination meta.
 */
export function useLeadsForUser(
  params: GetLeadsForUserParams = {},
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'for', params],
    queryFn: async () => getLeadsForUser(client, params),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches leads report (total, byStatus, byDay) for date range.
 * Enterprise-only; no retry on 403.
 */
export function useLeadsReport(
  params: GetLeadsReportParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [
      ...QUERY_KEY_PREFIX,
      'report',
      params.from,
      params.to,
      params.dateBasis ?? 'created',
      params.branchId ?? null,
      params.ownerId ?? null,
      params.status ?? null,
      params.source ?? null,
      params.search ?? null,
    ],
    queryFn: async () => getLeadsReport(client, params),
    enabled: (options?.enabled !== false) && !!params.from && !!params.to,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches a single lead by ID.
 * Enterprise-only; no retry on 403.
 */
export function useLead(ref: number | null | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'detail', ref ?? 'none'],
    queryFn: async () => getLead(client, ref!),
    enabled: (options?.enabled !== false) && ref != null && ref > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new lead. Invalidates leads list on success.
 */
export function useCreateLeadMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLeadPayload) => createLead(client, payload),
    onSuccess: () => {
      invalidateLeadQueries(queryClient);
    },
  });
}

/**
 * Update a lead. Invalidates leads list and detail on success.
 */
export function useUpdateLeadMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ref,
      payload,
    }: { ref: number; payload: UpdateLeadPayload }) =>
      updateLead(client, ref, payload),
    onSuccess: (_, { ref }) => {
      invalidateLeadQueries(queryClient, { detailRef: ref });
    },
  });
}

/**
 * Soft-delete a lead. Invalidates leads list and detail on success.
 */
export function useDeleteLeadMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ref: number) => deleteLead(client, ref),
    onSuccess: (_, ref) => {
      invalidateLeadQueries(queryClient, { detailRef: ref });
    },
  });
}

/**
 * Restore a soft-deleted lead. Invalidates leads list and detail on success.
 */
export function useRestoreLeadMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ref: number) => restoreLead(client, ref),
    onSuccess: (_, ref) => {
      invalidateLeadQueries(queryClient, { detailRef: ref });
    },
  });
}

/**
 * Reactivate a declined or cancelled lead. Invalidates leads list and detail on success.
 */
export function useReactivateLeadMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ref: number) => reactivateLead(client, ref),
    onSuccess: (_, ref) => {
      invalidateLeadQueries(queryClient, { detailRef: ref });
    },
  });
}

/**
 * Reassign / transfer leads to another user. Invalidates all lead queries on success.
 */
export function useReassignLeadsMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReassignLeadsPayload) =>
      reassignLeads(client, payload),
    onSuccess: (_, payload) => {
      const firstLead = payload.leadUids[0];
      invalidateLeadQueries(queryClient, {
        detailRef: firstLead,
      });
    },
  });
}

/**
 * Fetch AI-generated engage draft for a lead. Use as mutation so caller can trigger with channel/tone/casualness.
 */
export function useEngageDraftMutation() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async ({
      leadRef,
      ...params
    }: { leadRef: number } & EngageDraftParams) =>
      getEngageDraft(client, leadRef, params),
  });
}

/**
 * Send engage message to lead via email, sms, or whatsapp. Invalidates lead detail on success.
 */
export function useSendLeadEngageMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ref,
      channel,
      message,
    }: {
      ref: number;
      channel: 'email' | 'sms' | 'whatsapp';
      message: string;
    }) => sendLeadEngage(client, ref, { channel, message }),
    onSuccess: (_, { ref }) => {
      invalidateLeadQueries(queryClient, { detailRef: ref });
    },
  });
}

/**
 * Import leads from CSV file. Invalidates leads list on success.
 */
export function useImportLeadsMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formData,
      params,
      longRunning,
    }: {
      formData: FormData;
      params: ImportLeadsFromCSVParams;
      longRunning?: boolean;
    }) =>
      importLeadsFromCSV(client, formData, params, {
        longRunning: longRunning === true,
      }),
    onSuccess: () => {
      invalidateLeadQueries(queryClient);
    },
  });
}

/** POST /leads/dedupe - merge duplicates for current org; invalidates lead queries on success. */
export function useDedupeLeadsMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => dedupeLeads(client),
    onSuccess: () => {
      invalidateLeadQueries(queryClient);
    },
  });
}
