'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getLeads,
  getLeadsForUser,
  getLeadsReport,
  getLead,
} from '@/api/endpoints/leads';
import type { GetLeadsParams, GetLeadsReportParams } from '@/api/types/leads';

const QUERY_KEY_PREFIX = ['leads'] as const;

/**
 * Fetches paginated leads list.
 * Admin/owner: all leads. User: own leads only.
 * Enterprise-only; no retry on 403.
 */
export function useLeads(
  params: GetLeadsParams = {},
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'list', params],
    queryFn: async () => getLeads(client, params),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Fetches leads for the authenticated user (owner or assignee) with stats.
 * Enterprise-only; no retry on 403.
 */
export function useLeadsForUser(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'for'],
    queryFn: async () => getLeadsForUser(client),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
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
    queryKey: [...QUERY_KEY_PREFIX, 'report', params.from, params.to],
    queryFn: async () => getLeadsReport(client, params),
    enabled: (options?.enabled !== false) && !!params.from && !!params.to,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
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
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
}
