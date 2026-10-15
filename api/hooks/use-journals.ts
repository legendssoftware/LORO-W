'use client';

import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import {
  createJournal,
  deleteJournal,
  getJournal,
  getJournals,
  getJournalsForUser,
  updateJournal,
} from '@/api/endpoints/journal';
import type { GetJournalsParams } from '@/api/endpoints/journal';
import type {
  CreateJournalPayload,
  Journal,
  JournalStatus,
  UpdateJournalPayload,
} from '@/api/types/journal';
import { canViewOrgMerchandiseList } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

/** Query key prefix for merchandise / journal lists and details. */
export const JOURNALS_QUERY_KEY_PREFIX = ['journals'] as const;

const LIST_PAGE_SIZE = 25;

function mutationToastError(err: unknown, fallback: string) {
  toast.error(getQueryErrorMessage(err, fallback));
}

/** Invalidates list and, when provided, one detail query. */
export function invalidateJournalQueries(
  queryClient: QueryClient,
  opts?: { detailRef?: number | null }
) {
  queryClient.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY_PREFIX });
  if (opts?.detailRef != null) {
    queryClient.invalidateQueries({
      queryKey: [...JOURNALS_QUERY_KEY_PREFIX, 'detail', opts.detailRef],
    });
  }
}

export type JournalsListFilters = {
  status?: string;
  search?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
  authorId?: number;
  branchId?: number;
  startDate?: string;
  endDate?: string;
};

function matchesOwnJournal(journal: Journal, filters: JournalsListFilters): boolean {
  if (filters.status && filters.status !== 'all' && journal.status !== filters.status) {
    return false;
  }
  const q = (filters.search ?? '').trim().toLowerCase();
  if (q) {
    const owner = `${journal.owner?.name ?? ''} ${journal.owner?.surname ?? ''} ${journal.owner?.username ?? ''}`;
    const haystack = `${journal.clientRef ?? ''} ${journal.comments ?? ''} ${owner}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.authorId != null && journal.owner?.uid !== filters.authorId) return false;
  if (filters.branchId != null && journal.branch?.uid !== filters.branchId) return false;
  if (filters.startDate && filters.endDate) {
    const created = (journal.createdAt ?? '').slice(0, 10);
    if (created < filters.startDate || created > filters.endDate) return false;
  }
  return true;
}

/**
 * Org list for admins (`GET /journal`), own list for everyone else (`GET /journal/for/:uid`).
 * Both modes return one page. Own lists are filtered and sliced on the client.
 */
export function useJournals(filters: JournalsListFilters = {}) {
  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  const orgList = canViewOrgMerchandiseList(backendUserData?.accessLevel);
  const uid = backendUserData?.uid;
  const enabled = filters.enabled !== false;
  const status = filters.status && filters.status !== 'all' ? filters.status : undefined;
  const search = filters.search?.trim() || undefined;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? LIST_PAGE_SIZE;

  const orgQuery = useQuery({
    queryKey: [
      ...JOURNALS_QUERY_KEY_PREFIX,
      'page',
      page,
      limit,
      status ?? '',
      search ?? '',
      filters.authorId ?? '',
      filters.branchId ?? '',
      filters.startDate ?? '',
      filters.endDate ?? '',
    ],
    queryFn: () => {
      const params: GetJournalsParams = {
        page,
        limit,
        status,
        search,
        authorId: filters.authorId,
        branchId: filters.branchId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      return getJournals(client, params);
    },
    enabled: enabled && orgList,
    staleTime: 30 * 1000,
  });

  const mineQuery = useQuery({
    queryKey: [...JOURNALS_QUERY_KEY_PREFIX, 'mine', uid ?? 0],
    queryFn: () => getJournalsForUser(client, uid as number),
    enabled: enabled && !orgList && uid != null,
    staleTime: 30 * 1000,
  });

  const rows = useMemo(() => {
    if (orgList) return orgQuery.data?.data ?? [];
    const filtered = (mineQuery.data?.data ?? []).filter((journal) =>
      matchesOwnJournal(journal, filters)
    );
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [orgList, orgQuery.data, mineQuery.data, filters, page, limit]);

  const total = orgList
    ? (orgQuery.data?.meta.total ?? 0)
    : (mineQuery.data?.data ?? []).filter((journal) => matchesOwnJournal(journal, filters)).length;
  const totalPages = orgList
    ? (orgQuery.data?.meta.totalPages ?? 0)
    : total === 0
      ? 0
      : Math.ceil(total / limit);

  const activeError = orgList ? orgQuery.error : mineQuery.error;
  const activeQuery = orgList ? orgQuery : mineQuery;

  return {
    rows,
    total,
    totalPages,
    orgList,
    isLoading: activeQuery.isLoading,
    isFetching: activeQuery.isFetching,
    error: activeError,
    refetch: activeQuery.refetch,
  };
}

/** GET /journal/:ref */
export function useJournal(ref: number, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...JOURNALS_QUERY_KEY_PREFIX, 'detail', ref],
    queryFn: () => getJournal(client, ref),
    enabled: options?.enabled !== false && Number.isFinite(ref) && ref > 0,
    staleTime: 30 * 1000,
  });
}

/** POST /journal */
export function useCreateJournalMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJournalPayload) => createJournal(client, payload),
    onSuccess: () => {
      toast.success('Merchandise log created');
      invalidateJournalQueries(queryClient);
    },
    onError: (err) => mutationToastError(err, 'Could not create merchandise'),
  });
}

/** PATCH /journal/:ref */
export function useUpdateJournalMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ref: number; payload: UpdateJournalPayload }) =>
      updateJournal(client, input.ref, input.payload),
    onSuccess: (_data, variables) => {
      toast.success('Merchandise log updated');
      invalidateJournalQueries(queryClient, { detailRef: variables.ref });
    },
    onError: (err) => mutationToastError(err, 'Could not update merchandise'),
  });
}

/** PATCH status to PUBLISHED or REJECTED. */
export function useJournalStatusMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ref: number; status: Extract<JournalStatus, 'PUBLISHED' | 'REJECTED'> }) =>
      updateJournal(client, input.ref, { status: input.status }),
    onSuccess: (_data, variables) => {
      toast.success(variables.status === 'PUBLISHED' ? 'Merchandise published' : 'Merchandise rejected');
      invalidateJournalQueries(queryClient, { detailRef: variables.ref });
    },
    onError: (err) => mutationToastError(err, 'Could not update status'),
  });
}

/** DELETE /journal/:ref */
export function useDeleteJournalMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => deleteJournal(client, ref),
    onSuccess: (_data, ref) => {
      toast.success('Merchandise log deleted');
      invalidateJournalQueries(queryClient, { detailRef: ref });
    },
    onError: (err) => mutationToastError(err, 'Could not delete merchandise'),
  });
}
