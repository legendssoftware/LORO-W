'use client';

import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createClaim,
  createClaimGroup,
  deleteClaim,
  deleteClaimGroup,
  generateShareToken,
  getClaim,
  getClaims,
  getClaimsMe,
  listClaimGroups,
  updateClaim,
} from '@/api/endpoints/claims';
import type { GetClaimsParams } from '@/api/endpoints/claims';
import type {
  Claim,
  CreateClaimPayload,
  UpdateClaimPayload,
} from '@/api/types/claims';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useSessionStore } from '@/store/session-store';
import toast from 'react-hot-toast';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { canViewOrgClaimsList } from '@/lib/access';
import {
  utcDateFromYmd,
  utcRangeIsoFromUtcCalendarStoredRange,
} from '@/app/reports/utils/overview-daily-summary';

/** Query key prefix for claims. Use for invalidateQueries/refetchQueries after claim mutations. */
export const CLAIMS_QUERY_KEY_PREFIX = ['claims'] as const;

const LIST_PAGE_SIZE = 25;

const CLAIM_GROUPS_KEY = [...CLAIMS_QUERY_KEY_PREFIX, 'groups'] as const;

function mutationToastError(err: unknown, fallback: string) {
  const status = getErrorStatus(err);
  const msg = getQueryErrorMessage(err, fallback);
  if (status === 403) {
    toast.error(`${msg} Your organisation may not have the claims feature enabled.`);
    return;
  }
  toast.error(msg);
}

export function invalidateClaimsQueries(
  queryClient: QueryClient,
  opts?: { detailRef?: number | null }
) {
  queryClient.invalidateQueries({ queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'list'] });
  queryClient.invalidateQueries({ queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'infinite'] });
  queryClient.invalidateQueries({ queryKey: CLAIM_GROUPS_KEY });
  if (opts?.detailRef != null) {
    queryClient.invalidateQueries({
      queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'detail', opts.detailRef],
    });
  }
}

/**
 * Fetches claims list with optional filters (date range, status, pagination).
 * Use createdFrom/createdTo for payroll period to group by day in the modal.
 */
export function useClaims(
  params: GetClaimsParams = {},
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'list', params],
    queryFn: async () => getClaims(client, params),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export type ClaimsInfiniteFilters = {
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  claimGroupUid?: number;
  enabled?: boolean;
};

function filterClaimsClientSide(
  claims: Claim[],
  f: {
    status?: string;
    createdFrom?: string;
    createdTo?: string;
    claimGroupUid?: number;
  }
): Claim[] {
  let out = claims;
  if (f.status) {
    const s = f.status.toLowerCase();
    out = out.filter((c) => String(c.status).toLowerCase() === s);
  }
  if (f.claimGroupUid != null && Number.isFinite(f.claimGroupUid)) {
    out = out.filter((c) => c.claimGroupUid === f.claimGroupUid);
  }
  if (f.createdFrom) {
    const start = utcDateFromYmd(f.createdFrom);
    const { startDate } = utcRangeIsoFromUtcCalendarStoredRange(start, start);
    const from = new Date(startDate);
    out = out.filter((c) => (c.createdAt ? new Date(c.createdAt) >= from : false));
  }
  if (f.createdTo) {
    const endDay = utcDateFromYmd(f.createdTo);
    const { endDate } = utcRangeIsoFromUtcCalendarStoredRange(endDay, endDay);
    const to = new Date(endDate);
    out = out.filter((c) => (c.createdAt ? new Date(c.createdAt) <= to : false));
  }
  return out;
}

/**
 * Claims list for the main Claims page: admin/owner → paginated GET /claims;
 * everyone else → GET /claims/me with client-side filters (API has no query params on /me).
 */
export function useClaimsInfinite(filters?: ClaimsInfiniteFilters) {
  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  const profileAccessLevel = useSessionStore((s) => s.profileData?.accessLevel);
  const accessLevelForList =
    (typeof backendUserData?.accessLevel === 'string'
      ? backendUserData.accessLevel
      : undefined) ??
    (typeof profileAccessLevel === 'string' ? profileAccessLevel : undefined);
  const pagedList = canViewOrgClaimsList(accessLevelForList);

  const status = filters?.status?.trim() || undefined;
  const createdFrom = filters?.createdFrom?.trim() || undefined;
  const createdTo = filters?.createdTo?.trim() || undefined;
  const claimGroupUid = filters?.claimGroupUid;
  const enabled = filters?.enabled !== false;

  const pagedEnabled = enabled && pagedList;
  const meEnabled = enabled && !pagedList;

  const pagedResult = useInfiniteQuery({
    queryKey: [
      ...CLAIMS_QUERY_KEY_PREFIX,
      'infinite',
      'paged',
      status ?? '',
      createdFrom ?? '',
      createdTo ?? '',
      claimGroupUid ?? '',
    ],
    queryFn: async ({ pageParam }) =>
      getClaims(client, {
        page: pageParam,
        limit: LIST_PAGE_SIZE,
        status,
        createdFrom,
        createdTo,
        claimGroupUid,
      }),
    getNextPageParam: (lastPage) => {
      const page = lastPage.meta?.page ?? 1;
      const totalPages = lastPage.meta?.totalPages ?? 0;
      if (page < totalPages) return page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: pagedEnabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const meResult = useInfiniteQuery({
    queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'infinite', 'me'],
    queryFn: async () => getClaimsMe(client),
    getNextPageParam: () => undefined,
    initialPageParam: 1,
    enabled: meEnabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const active = pagedList ? pagedResult : meResult;
  const rows = useMemo(() => {
    const rawRows = active.data?.pages.flatMap((p) => p.data ?? []) ?? [];
    if (pagedList) return rawRows;
    return filterClaimsClientSide(rawRows, {
      status,
      createdFrom,
      createdTo,
      claimGroupUid,
    });
  }, [active.data, pagedList, status, createdFrom, createdTo, claimGroupUid]);

  return {
    ...active,
    rows,
  };
}

export function useClaim(ref: number | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  const enabled =
    options?.enabled !== false && ref != null && Number.isInteger(ref) && ref > 0;

  return useQuery({
    queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'detail', ref],
    queryFn: async () => getClaim(client, ref!),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useClaimGroups(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: CLAIM_GROUPS_KEY,
    queryFn: async () => listClaimGroups(client),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

export function useCreateClaimMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateClaimPayload) => createClaim(client, body),
    onSuccess: (res) => {
      toast.success(res.message || 'Claim created');
      invalidateClaimsQueries(queryClient, { detailRef: res.claim?.uid });
    },
    onError: (err) => mutationToastError(err, 'Could not create claim'),
  });
}

export function useUpdateClaimMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ref, body }: { ref: number; body: UpdateClaimPayload }) =>
      updateClaim(client, ref, body),
    onSuccess: (_res, vars) => {
      toast.success('Claim updated');
      invalidateClaimsQueries(queryClient, { detailRef: vars.ref });
    },
    onError: (err) => mutationToastError(err, 'Could not update claim'),
  });
}

export function useDeleteClaimMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ref: number) => deleteClaim(client, ref),
    onSuccess: (res, ref) => {
      toast.success(res.message || 'Claim deleted');
      invalidateClaimsQueries(queryClient, { detailRef: ref });
    },
    onError: (err) => mutationToastError(err, 'Could not delete claim'),
  });
}

export function useGenerateShareTokenMutation() {
  const client = useApiClient();

  return useMutation({
    mutationFn: (ref: number) => generateShareToken(client, ref),
    onError: (err) => mutationToastError(err, 'Could not generate share link'),
  });
}

export function useCreateClaimGroupMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { title: string; kind?: string }) =>
      createClaimGroup(client, payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Folder created');
      queryClient.invalidateQueries({ queryKey: CLAIM_GROUPS_KEY });
    },
    onError: (err) => mutationToastError(err, 'Could not create folder'),
  });
}

export function useDeleteClaimGroupMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: number) => deleteClaimGroup(client, uid),
    onSuccess: (res) => {
      toast.success(res.message || 'Folder removed');
      queryClient.invalidateQueries({ queryKey: CLAIM_GROUPS_KEY });
      queryClient.invalidateQueries({ queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'infinite'] });
      queryClient.invalidateQueries({ queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'list'] });
    },
    onError: (err) => mutationToastError(err, 'Could not delete folder'),
  });
}
