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
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  restoreClient,
} from '@/api/endpoints/clients';
import type { ClientListItem, CreateClientPayload, UpdateClientPayload } from '@/api/types/clients';
import toast from 'react-hot-toast';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { CLIENTS_MAP_DATA_QUERY_KEY } from '@/api/hooks/use-clients-map-data';

export const CLIENTS_QUERY_KEY_PREFIX = ['clients'] as const;

const PAGE_SIZE = 100;

export function invalidateClientQueries(
  queryClient: QueryClient,
  opts?: { detailRef?: number | null }
) {
  queryClient.invalidateQueries({ queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'list'] });
  queryClient.invalidateQueries({ queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'infinite'] });
  queryClient.invalidateQueries({ queryKey: CLIENTS_MAP_DATA_QUERY_KEY });
  if (opts?.detailRef != null) {
    queryClient.invalidateQueries({
      queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'detail', opts.detailRef],
    });
  }
}

export type ClientsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
};

export function useClients(options?: ClientsListParams & { enabled?: boolean }) {
  const client = useApiClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 500;
  const search = options?.search?.trim() || '';
  const status = options?.status?.trim() || '';
  const category = options?.category?.trim() || '';

  return useQuery({
    queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'list', page, limit, search, status, category],
    queryFn: async () => {
      const res = await getClients(client, {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
      });
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useClientsInfinite(
  options?: {
    search?: string;
    status?: string;
    category?: string;
    enabled?: boolean;
  }
) {
  const client = useApiClient();
  const search = (options?.search ?? '').trim() || undefined;
  const status = (options?.status ?? '').trim() || undefined;
  const category = (options?.category ?? '').trim() || undefined;

  const result = useInfiniteQuery({
    queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'infinite', search ?? '', status ?? '', category ?? ''],
    queryFn: async ({ pageParam }) => {
      const res = await getClients(client, {
        page: pageParam,
        limit: PAGE_SIZE,
        search,
        status,
        category,
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
    data: data as ClientListItem[],
  };
}

export function useClient(ref: number | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  const enabled = options?.enabled !== false && ref != null && ref > 0;

  return useQuery({
    queryKey: [...CLIENTS_QUERY_KEY_PREFIX, 'detail', ref],
    queryFn: async () => {
      const res = await getClient(client, ref!);
      return res.client;
    },
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateClientMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientPayload) => createClient(api, payload),
    onSuccess: () => {
      invalidateClientQueries(queryClient);
      toast.success('Client created');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Could not create client'));
    },
  });
}

export function useUpdateClientMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, payload }: { ref: number; payload: UpdateClientPayload }) =>
      updateClient(api, ref, payload),
    onSuccess: (_data, variables) => {
      invalidateClientQueries(queryClient, { detailRef: variables.ref });
      toast.success('Client updated');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Could not update client'));
    },
  });
}

export function useDeleteClientMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => deleteClient(api, ref),
    onSuccess: (_data, ref) => {
      invalidateClientQueries(queryClient, { detailRef: ref });
      toast.success('Client removed');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Could not delete client'));
    },
  });
}

export function useRestoreClientMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => restoreClient(api, ref),
    onSuccess: (_data, ref) => {
      invalidateClientQueries(queryClient, { detailRef: ref });
      toast.success('Client restored');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Could not restore client'));
    },
  });
}
