'use client';

import { useMemo } from 'react';
import type { AxiosInstance } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createAsset,
  deleteAsset,
  getAssets,
  getAssetsByUser,
  updateAsset,
} from '@/api/endpoints/assets';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
import type {
  AssetRecord,
  CreateAssetPayload,
  UpdateAssetPayload,
} from '@/api/types/asset';
import toast from 'react-hot-toast';
import { getQueryErrorMessage } from '@/lib/api/query-error';

export const ASSETS_QUERY_KEY_PREFIX = ['assets'] as const;

const ORG_VEHICLES_QUERY_KEY = [...ASSETS_QUERY_KEY_PREFIX, 'org-vehicles'] as const;
const VEHICLE_ASSIGNMENT_USERS_QUERY_KEY = [
  ...ASSETS_QUERY_KEY_PREFIX,
  'vehicle-assignment-users',
] as const;

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

export function useUserVehicleAssets(
  userUid: number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user', userUid],
    queryFn: async () => {
      if (userUid == null) return [] as AssetRecord[];
      const res = await getAssetsByUser(client, userUid);
      return (res.assets ?? []).filter(isActiveVehicle);
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
      const res = await getAssets(client);
      return (res.assets ?? []).filter(isActiveVehicle);
    },
    enabled,
    staleTime: 60 * 1000,
  });

  const ownedQuery = useQuery({
    queryKey: [...ASSETS_QUERY_KEY_PREFIX, 'for-user', userUid],
    queryFn: async () => {
      if (userUid == null) return [] as AssetRecord[];
      const res = await getAssetsByUser(client, userUid);
      return (res.assets ?? []).filter(isActiveVehicle);
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
    isLoading:
      vehiclesQuery.isLoading || ownedQuery.isLoading || usersQuery.isLoading,
    refetch,
  };
}

export function useCreateAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(client, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY_PREFIX });
      toast.success('Vehicle added');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to add vehicle'));
    },
  });
}

export function useUpdateAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, payload }: { uid: number; payload: UpdateAssetPayload }) =>
      updateAsset(client, uid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY_PREFIX });
      toast.success('Vehicle updated');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to update vehicle'));
    },
  });
}

export function useDeleteAssetMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: number) => deleteAsset(client, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY_PREFIX });
      toast.success('Vehicle removed');
    },
    onError: (err) => {
      toast.error(getQueryErrorMessage(err, 'Failed to remove vehicle'));
    },
  });
}
