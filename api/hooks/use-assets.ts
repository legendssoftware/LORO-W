'use client';

import { useMemo } from 'react';
import type { AxiosInstance } from 'axios';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createAsset,
  deleteAsset,
  getAsset,
  getAssets,
  getAssetsByUser,
  updateAsset,
} from '@/api/endpoints/assets';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
import type {
  AssetListParams,
  AssetRecord,
  AssetsListResponse,
  CreateAssetPayload,
  UpdateAssetPayload,
} from '@/api/types/asset';
import toast from 'react-hot-toast';
import { getQueryErrorMessage } from '@/lib/api/query-error';

export const ASSETS_QUERY_KEY_PREFIX = ['assets'] as const;
const ASSET_PAGE_SIZE = 24;

function invalidateAssetQueries(queryClient: QueryClient, detailUid?: number) {
  queryClient.invalidateQueries({ queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'infinite'] });
  queryClient.invalidateQueries({ queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'page'] });
  queryClient.invalidateQueries({ queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user'] });
  queryClient.invalidateQueries({ queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user-all'] });
  queryClient.invalidateQueries({ queryKey: ORG_VEHICLES_QUERY_KEY });
  if (detailUid != null) {
    queryClient.invalidateQueries({ queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'one', detailUid] });
  }
}

async function collectAssetPages(
  load: (page: number) => Promise<AssetsListResponse>
): Promise<AssetRecord[]> {
  const all: AssetRecord[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const res = await load(page);
    const chunk = res.assets ?? [];
    all.push(...chunk);
    totalPages = Math.max(1, res.meta?.totalPages ?? 1);
    if (chunk.length === 0) break;
    page += 1;
  }
  return all;
}

const ORG_VEHICLES_QUERY_KEY = [...ASSETS_QUERY_KEY_PREFIX, 'org-vehicles'] as const;
const VEHICLE_ASSIGNMENT_USERS_QUERY_KEY = [
  ...ASSETS_QUERY_KEY_PREFIX,
  'vehicle-assignment-users',
] as const;

const EMPTY_VEHICLES: AssetRecord[] = [];
const EMPTY_LISTED_ASSIGNMENT = {
  primaryUid: null as number | null,
  secondaryUid: null as number | null,
};

function listedAssetUid(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function isActiveVehicle(asset: AssetRecord): boolean {
  return asset.category === 'VEHICLE';
}

/** Vehicles assigned as primary/secondary on another user's target. */
export function collectVehicleAssignmentsElsewhere(
  users: UserListItem[],
  excludeUserUid: number
): Set<number> {
  const assigned = new Set<number>();
  for (const user of users) {
    if (user.uid === excludeUserUid) continue;
    const target = user.userTarget;
    if (!target) continue;
    const primary = target.primaryVehicleAssetUid;
    const secondary = target.secondaryVehicleAssetUid;
    if (typeof primary === 'number' && primary > 0) assigned.add(primary);
    if (typeof secondary === 'number' && secondary > 0) assigned.add(secondary);
  }
  return assigned;
}

/** Active fleet vehicles that are unassigned or pinned to this user's current selection. */
export function filterAvailableVehicles(
  vehicles: AssetRecord[],
  assignedElsewhere: Set<number>,
  pinnedUids: Iterable<number | null | undefined>
): AssetRecord[] {
  const pinned = new Set(
    [...pinnedUids].filter((uid): uid is number => uid != null && uid > 0)
  );
  return vehicles.filter(
    (asset) => !assignedElsewhere.has(asset.uid) || pinned.has(asset.uid)
  );
}

async function fetchActiveOrgUsers(client: AxiosInstance): Promise<UserListItem[]> {
  const all: UserListItem[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 50) {
    const res = await getUsers(client, { page, limit: 100, status: 'active' });
    const chunk = Array.isArray(res?.data) ? res.data : [];
    all.push(...chunk);
    totalPages = Math.max(1, Number(res?.meta?.totalPages) || 1);
    if (chunk.length === 0) break;
    page += 1;
  }
  return all;
}

/** Paged assets. `mine` uses GET /assets/for/:uid; `org` uses GET /assets. */
export function useAssetsInfinite(options: {
  scope: 'mine' | 'org';
  userUid?: number | null;
  search?: string;
  category?: string;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const search = options.search?.trim() || undefined;
  const category =
    options.category && options.category !== 'all' ? options.category : undefined;
  const userUid = options.userUid;
  const enabled =
    options.enabled !== false &&
    (options.scope === 'org' || (userUid != null && userUid > 0));

  const result = useInfiniteQuery({
    queryKey: [
      ...ASSETS_QUERY_KEY_PREFIX,
      'infinite',
      options.scope,
      userUid ?? 'self',
      search ?? '',
      category ?? '',
    ],
    queryFn: async ({ pageParam }) => {
      const params: AssetListParams = {
        page: pageParam,
        limit: ASSET_PAGE_SIZE,
        search,
        category,
      };
      if (options.scope === 'org') return getAssets(client, params);
      return getAssetsByUser(client, userUid as number, params);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const page = lastPage.meta?.page ?? 1;
      const totalPages = lastPage.meta?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled,
    staleTime: 60 * 1000,
  });

  const data = result.data?.pages.flatMap((page) => page.assets ?? []) ?? [];
  return { ...result, data };
}

/** One page of assets. `mine` uses GET /assets/for/:uid; `org` uses GET /assets. */
export function useAssetsPage(options: {
  scope: 'mine' | 'org';
  userUid?: number | null;
  search?: string;
  category?: string;
  page: number;
  limit: number;
  ownerUid?: number;
  branchUid?: number;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const search = options.search?.trim() || undefined;
  const category =
    options.category && options.category !== 'all' ? options.category : undefined;
  const userUid = options.userUid;
  const enabled =
    options.enabled !== false &&
    (options.scope === 'org' || (userUid != null && userUid > 0));

  return useQuery({
    queryKey: [
      ...ASSETS_QUERY_KEY_PREFIX,
      'page',
      options.scope,
      userUid ?? 'self',
      search ?? '',
      category ?? '',
      options.page,
      options.limit,
      options.ownerUid ?? '',
      options.branchUid ?? '',
      options.startDate ?? '',
      options.endDate ?? '',
    ],
    queryFn: () => {
      const params: AssetListParams = {
        page: options.page,
        limit: options.limit,
        search,
        category,
        ownerUid: options.ownerUid,
        branchUid: options.branchUid,
        startDate: options.startDate,
        endDate: options.endDate,
      };
      if (options.scope === 'org') return getAssets(client, params);
      return getAssetsByUser(client, userUid as number, params);
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAsset(uid: number | null | undefined, enabled = true) {
  const client = useApiClient();

  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'one', uid],
    queryFn: async () => {
      if (uid == null) return null;
      const res = await getAsset(client, uid);
      return res.asset;
    },
    enabled: enabled && uid != null && uid > 0,
    staleTime: 30 * 1000,
  });
}

export function useUserVehicleAssets(
  userUid: number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user', userUid],
    queryFn: async () => {
      if (userUid == null) return [] as AssetRecord[];
      const assets = await collectAssetPages((page) =>
        getAssetsByUser(client, userUid, { page, limit: 100, category: 'VEHICLE' })
      );
      return assets.filter(isActiveVehicle);
    },
    enabled: options?.enabled !== false && userUid != null && userUid > 0,
    staleTime: 60 * 1000,
  });
}

export function useSelectableVehicleAssets(
  userUid: number | null | undefined,
  options?: {
    enabled?: boolean;
    primaryUid?: number | null;
    secondaryUid?: number | null;
  }
) {
  const client = useApiClient();
  const enabled = options?.enabled !== false && userUid != null && userUid > 0;

  const vehiclesQuery = useQuery({
    queryKey: ORG_VEHICLES_QUERY_KEY,
    queryFn: async () => {
      const assets = await collectAssetPages((page) =>
        getAssets(client, { page, limit: 100, category: 'VEHICLE' })
      );
      return assets.filter(isActiveVehicle);
    },
    enabled,
    staleTime: 60 * 1000,
  });

  const ownedQuery = useQuery({
    queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user', userUid],
    queryFn: async () => {
      if (userUid == null) return [] as AssetRecord[];
      const assets = await collectAssetPages((page) =>
        getAssetsByUser(client, userUid, { page, limit: 100, category: 'VEHICLE' })
      );
      return assets.filter(isActiveVehicle);
    },
    enabled,
    staleTime: 60 * 1000,
  });

  const usersQuery = useQuery({
    queryKey: VEHICLE_ASSIGNMENT_USERS_QUERY_KEY,
    queryFn: () => fetchActiveOrgUsers(client),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const fleetVehicles = useMemo(() => {
    const byUid = new Map<number, AssetRecord>();
    for (const asset of vehiclesQuery.data ?? []) {
      byUid.set(asset.uid, asset);
    }
    for (const asset of ownedQuery.data ?? []) {
      byUid.set(asset.uid, asset);
    }
    return [...byUid.values()].sort((a, b) => a.uid - b.uid);
  }, [vehiclesQuery.data, ownedQuery.data]);

  const data = useMemo(() => {
    if (!userUid || !usersQuery.data) return fleetVehicles;
    const assignedElsewhere = collectVehicleAssignmentsElsewhere(usersQuery.data, userUid);
    return filterAvailableVehicles(fleetVehicles, assignedElsewhere, [
      options?.primaryUid,
      options?.secondaryUid,
    ]);
  }, [
    fleetVehicles,
    usersQuery.data,
    userUid,
    options?.primaryUid,
    options?.secondaryUid,
  ]);

  const listedAssignment = useMemo(() => {
    if (!userUid || !usersQuery.data) return EMPTY_LISTED_ASSIGNMENT;
    const match = usersQuery.data.find((user) => user.uid === userUid);
    const target = match?.userTarget;
    return {
      primaryUid: listedAssetUid(target?.primaryVehicleAssetUid),
      secondaryUid: listedAssetUid(target?.secondaryVehicleAssetUid),
    };
  }, [userUid, usersQuery.data]);

  async function refetch(): Promise<AssetRecord[]> {
    const [vehiclesResult, ownedResult] = await Promise.all([
      vehiclesQuery.refetch(),
      ownedQuery.refetch(),
      usersQuery.refetch(),
    ]);
    const byUid = new Map<number, AssetRecord>();
    for (const asset of vehiclesResult.data ?? []) {
      byUid.set(asset.uid, asset);
    }
    for (const asset of ownedResult.data ?? []) {
      byUid.set(asset.uid, asset);
    }
    return [...byUid.values()];
  }

  return {
    data,
    fleetVehicles,
    ownedVehicles: ownedQuery.data ?? EMPTY_VEHICLES,
    listedAssignment,
    isLoading: vehiclesQuery.isLoading || ownedQuery.isLoading,
    refetch,
  };
}

export function useCreateAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(client, payload),
    onSuccess: () => {
      invalidateAssetQueries(queryClient);
      toast.success('Asset added');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to add asset'));
    },
  });
}

export function useUpdateAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, payload }: { uid: number; payload: UpdateAssetPayload }) =>
      updateAsset(client, uid, payload),
    onSuccess: (_data, variables) => {
      invalidateAssetQueries(queryClient, variables.uid);
      toast.success('Asset updated');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to update asset'));
    },
  });
}

export function useDeleteAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: number) => deleteAsset(client, uid),
    onSuccess: (_data, uid) => {
      invalidateAssetQueries(queryClient, uid);
      toast.success('Asset removed');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to remove asset'));
    },
  });
}
