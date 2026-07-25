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
  getCompetitors,
  getCompetitor,
  createCompetitor,
  updateCompetitor,
  bulkUpdateCompetitors,
  deleteCompetitor,
  importCompetitorsFromCSV,
} from '@/api/endpoints/competitors';
import type {
  BulkUpdateCompetitorsPayload,
  CreateCompetitorPayload,
  UpdateCompetitorPayload,
} from '@/api/types/competitors';
import toast from 'react-hot-toast';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { COMPETITORS_MAP_DATA_QUERY_KEY } from '@/api/hooks/use-competitors-map-data';

export const COMPETITORS_QUERY_KEY_PREFIX = ['competitors'] as const;

const PAGE_SIZE = 100;

function mutationToastError(err: unknown, fallback: string) {
  const status = getErrorStatus(err);
  const msg = getQueryErrorMessage(err, fallback);
  if (status === 403) {
    toast.error(`${msg} Admin or manager access is required for this action.`);
    return;
  }
  toast.error(msg);
}

export function invalidateCompetitorQueries(
  queryClient: QueryClient,
  opts?: { detailId?: number | null }
) {
  queryClient.invalidateQueries({ queryKey: [...COMPETITORS_QUERY_KEY_PREFIX, 'list'] });
  queryClient.invalidateQueries({ queryKey: [...COMPETITORS_QUERY_KEY_PREFIX, 'infinite'] });
  queryClient.invalidateQueries({ queryKey: COMPETITORS_MAP_DATA_QUERY_KEY });
  if (opts?.detailId != null) {
    queryClient.invalidateQueries({
      queryKey: [...COMPETITORS_QUERY_KEY_PREFIX, 'detail', opts.detailId],
    });
  }
}

export type CompetitorsListParams = {
  page?: number;
  limit?: number;
  name?: string;
  status?: string;
  industry?: string;
  isDirect?: boolean;
  minThreatLevel?: number;
};

export function useCompetitorsInfinite(options?: {
  name?: string;
  status?: string;
  industry?: string;
  isDirect?: boolean;
  minThreatLevel?: number;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const name = (options?.name ?? '').trim() || undefined;
  const status = (options?.status ?? '').trim() || undefined;
  const industry = (options?.industry ?? '').trim() || undefined;
  const isDirect = options?.isDirect;
  const minThreatLevel = options?.minThreatLevel;

  const result = useInfiniteQuery({
    queryKey: [
      ...COMPETITORS_QUERY_KEY_PREFIX,
      'infinite',
      name ?? '',
      status ?? '',
      industry ?? '',
      isDirect === true ? '1' : isDirect === false ? '0' : '',
      minThreatLevel ?? '',
    ],
    queryFn: async ({ pageParam }) => {
      const res = await getCompetitors(client, {
        page: pageParam,
        limit: PAGE_SIZE,
        name,
        status,
        industry,
        isDirect,
        minThreatLevel,
      });
      return res;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const data = result.data?.pages.flatMap((p) => p.data) ?? [];
  return {
    ...result,
    data: data,
  };
}

export function useCompetitor(id: number | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  const enabled = options?.enabled !== false && id != null && id > 0;

  return useQuery({
    queryKey: [...COMPETITORS_QUERY_KEY_PREFIX, 'detail', id],
    queryFn: async () => {
      const res = await getCompetitor(client, id!);
      return res.competitor;
    },
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateCompetitorMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompetitorPayload) => createCompetitor(api, payload),
    onSuccess: () => {
      invalidateCompetitorQueries(queryClient);
      toast.success('Competitor created');
    },
    onError: (err) => mutationToastError(err, 'Could not create competitor'),
  });
}

export function useUpdateCompetitorMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCompetitorPayload }) =>
      updateCompetitor(api, id, payload),
    onSuccess: (_data, variables) => {
      invalidateCompetitorQueries(queryClient, { detailId: variables.id });
      toast.success('Competitor updated');
    },
    onError: (err) => mutationToastError(err, 'Could not update competitor'),
  });
}

export function useBulkUpdateCompetitorsMutation(options?: {
  /** When true, skip the default success toast (caller shows a custom message). */
  silentSuccess?: boolean;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkUpdateCompetitorsPayload) =>
      bulkUpdateCompetitors(api, payload),
    onSuccess: (data) => {
      invalidateCompetitorQueries(queryClient);
      if (options?.silentSuccess) return;
      const ok = data.successCount ?? data.results?.filter((r) => r.success).length ?? 0;
      const fail = data.failureCount ?? 0;
      if (fail > 0) {
        toast.success(`Updated ${ok} competitors (${fail} failed)`);
      } else {
        toast.success(`Updated ${ok} competitor${ok === 1 ? '' : 's'}`);
      }
    },
    onError: (err) => mutationToastError(err, 'Could not bulk-update competitors'),
  });
}

export function useDeleteCompetitorMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCompetitor(api, id),
    onSuccess: (_data, id) => {
      invalidateCompetitorQueries(queryClient, { detailId: id });
      toast.success('Competitor removed');
    },
    onError: (err) => mutationToastError(err, 'Could not delete competitor'),
  });
}

export function useImportCompetitorsMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formData,
      longRunning,
      branchId,
    }: {
      formData: FormData;
      longRunning?: boolean;
      branchId?: number;
    }) =>
      importCompetitorsFromCSV(api, formData, {
        longRunning: longRunning === true,
        branchId,
      }),
    onSuccess: () => {
      invalidateCompetitorQueries(queryClient);
    },
  });
}
