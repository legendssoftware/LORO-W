'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getSessionSyncQueryKey } from '@/api/hooks/use-session-sync';
import { DAILY_OVERVIEW_QUERY_KEY_PREFIX } from '@/api/hooks/use-daily-overview';
import { REPORTS_USERS_QUERY_KEY_PREFIX } from '@/api/query-keys';
import { useSessionStore } from '@/store/session-store';
import {
  getUserByRef,
  patchUser,
  deleteUser,
  restoreUser,
  deleteUserPermanently,
  getUserTarget,
  getDailyProductivity,
  getBonusStatus,
  patchUserTarget,
  clearSelectedPerformanceWarnings,
  getUserPreferences,
  patchUserPreferences,
  postAcknowledgePerformanceWarning,
  getSubThresholdDailyCalls,
  getEngagementRange,
  type PatchUserBody,
  type PatchUserTargetBody,
  type UserResponse,
  type ClearSelectedPerformanceWarningsBody,
  type ReportsDashboardPreferences,
} from '@/api/endpoints/user';

const QUERY_KEY_PREFIX = ['user'] as const;
export const USER_TARGET_QUERY_KEY_PREFIX = ['user', 'target'] as const;
const TARGET_QUERY_KEY_PREFIX = USER_TARGET_QUERY_KEY_PREFIX;
export const DAILY_PRODUCTIVITY_KEY_PREFIX = [
  'user',
  'daily-productivity',
] as const;
const BONUS_STATUS_KEY_PREFIX = ['user', 'bonus-status'] as const;

function invalidateOrgUserListCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY_PREFIX });
  queryClient.invalidateQueries({ queryKey: ['users'] });
  queryClient.invalidateQueries({ queryKey: [...REPORTS_USERS_QUERY_KEY_PREFIX] });
  queryClient.invalidateQueries({ queryKey: DAILY_OVERVIEW_QUERY_KEY_PREFIX });
}

export function useUser(
  ref: string | null,
  options?: { enabled?: boolean; includeDeleted?: boolean; includeAssignedClients?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, ref, options?.includeDeleted ?? false, options?.includeAssignedClients],
    queryFn: async () => {
      if (!ref) return null;
      const res = await getUserByRef(client, ref, {
        includeDeleted: options?.includeDeleted,
        includeAssignedClients: options?.includeAssignedClients,
      });
      return res.user;
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePatchUser(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PatchUserBody) => {
      if (!ref) throw new Error('User ref required');
      return patchUser(client, ref, body);
    },
    onSuccess: (_data, body) => {
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
      const currentUid = useSessionStore.getState().profileData?.uid;
      const refNum = ref != null ? Number(ref) : NaN;
      const isSelf =
        currentUid != null &&
        !Number.isNaN(refNum) &&
        Number(currentUid) === refNum;
      const profileFields = [
        'photoURL',
        'avatar',
        'name',
        'surname',
        'email',
        'phone',
        'username',
        'businesscardURL',
      ] as const;
      const touchesProfile = profileFields.some(
        (k) => body[k as keyof PatchUserBody] !== undefined
      );
      if (isSelf && touchesProfile) {
        queryClient.invalidateQueries({ queryKey: getSessionSyncQueryKey() });
      }
    },
  });
}

export function useDeleteUser(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return deleteUser(client, ref);
    },
    onSuccess: () => {
      invalidateOrgUserListCaches(queryClient);
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useRestoreUser(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return restoreUser(client, ref);
    },
    onSuccess: () => {
      invalidateOrgUserListCaches(queryClient);
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useDeleteUserPermanently(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return deleteUserPermanently(client, ref);
    },
    onSuccess: () => {
      invalidateOrgUserListCaches(queryClient);
      if (ref) {
        queryClient.removeQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useUserTarget(ref: string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TARGET_QUERY_KEY_PREFIX, ref],
    queryFn: async () => {
      if (!ref) return { userTarget: null, message: '' };
      const res = await getUserTarget(client, ref);
      return res;
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useDailyProductivity(
  ref: string | null,
  startDate: string | null,
  endDate: string | null,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...DAILY_PRODUCTIVITY_KEY_PREFIX, ref, startDate, endDate],
    queryFn: async () => {
      if (!ref || !startDate || !endDate) {
        return { message: '', days: [] };
      }
      return getDailyProductivity(client, ref, { startDate, endDate });
    },
    enabled:
      (options?.enabled !== false && !!ref && !!startDate && !!endDate) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useBonusStatus(
  ref: string | null,
  options?: { enabled?: boolean; asOf?: string }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...BONUS_STATUS_KEY_PREFIX, ref, options?.asOf ?? null],
    queryFn: async () => {
      if (!ref) {
        return null;
      }
      return getBonusStatus(client, ref, { asOf: options?.asOf });
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

const PREFERENCES_QUERY_KEY_PREFIX = ['user', 'preferences'] as const;

export function useUserPreferences(ref: string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...PREFERENCES_QUERY_KEY_PREFIX, ref],
    queryFn: async () => {
      if (!ref) return { preferences: {}, message: '' };
      return getUserPreferences(client, ref);
    },
    enabled: (options?.enabled !== false && !!ref) ?? false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePatchUserPreferences(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      reportsDashboard?: ReportsDashboardPreferences;
      [key: string]: unknown;
    }) => {
      if (!ref) throw new Error('User ref required');
      return patchUserPreferences(client, ref, body);
    },
    onSuccess: () => {
      if (ref) {
        queryClient.invalidateQueries({
          queryKey: [...PREFERENCES_QUERY_KEY_PREFIX, ref],
        });
      }
    },
  });
}

export function usePatchUserTarget(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PatchUserTargetBody) => {
      if (!ref) throw new Error('User ref required');
      return patchUserTarget(client, ref, body);
    },
    onSuccess: (_, __, ___) => {
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
        queryClient.invalidateQueries({ queryKey: [...TARGET_QUERY_KEY_PREFIX, ref] });
      }
    },
  });
}

export function useClearSelectedPerformanceWarnings(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ClearSelectedPerformanceWarningsBody) => {
      if (!ref) throw new Error('User ref required');
      return clearSelectedPerformanceWarnings(client, ref, body);
    },
    onSuccess: () => {
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, ref] });
        queryClient.invalidateQueries({ queryKey: [...TARGET_QUERY_KEY_PREFIX, ref] });
      }
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: DAILY_OVERVIEW_QUERY_KEY_PREFIX });
      queryClient.invalidateQueries({ queryKey: getSessionSyncQueryKey() });
    },
  });
}


export function subThresholdDailyCallsQueryKey(
  params: { date: string; branchId?: number; minCalls?: number } | null | undefined
) {
  return [
    ...QUERY_KEY_PREFIX,
    'sub-threshold-calls',
    params?.date,
    params?.branchId,
    params?.minCalls,
  ] as const;
}

export function useSubThresholdDailyCalls(
  params: { date: string; branchId?: number; minCalls?: number } | null,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: subThresholdDailyCallsQueryKey(params),
    queryFn: async () => {
      if (!params?.date) {
        return { message: '', date: '', minCalls: 60, users: [] };
      }
      return getSubThresholdDailyCalls(client, params);
    },
    enabled: (options?.enabled !== false && !!params?.date) ?? false,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function engagementRangeQueryKey(
  params: { from: string; to: string; branchId?: number } | null | undefined
) {
  return [
    ...QUERY_KEY_PREFIX,
    'engagement-range',
    params?.from,
    params?.to,
    params?.branchId,
  ] as const;
}

/** Longer stale time when the range ends before today (immutable historical data). */
function engagementRangeStaleTimeMs(
  params: { from: string; to: string; branchId?: number } | null
): number {
  if (!params?.to || !/^\d{4}-\d{2}-\d{2}$/.test(params.to)) return 60 * 1000;
  const now = new Date();
  const todayYmd = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('-');
  return params.to < todayYmd ? 10 * 60 * 1000 : 60 * 1000;
}

export function useEngagementRange(
  params: { from: string; to: string; branchId?: number } | null,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: engagementRangeQueryKey(params),
    queryFn: async () => {
      if (!params?.from || !params?.to) {
        return { message: '', from: '', to: '', users: [] };
      }
      if (process.env.NODE_ENV === 'development') {
        console.debug('[engagement-range] request', params);
      }
      const data = await getEngagementRange(client, params);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[engagement-range] response', {
          from: data.from,
          to: data.to,
          users: data.users.length,
          sample: data.users.slice(0, 3),
        });
      }
      return data;
    },
    enabled:
      (options?.enabled !== false && !!params?.from && !!params?.to) ?? false,
    staleTime: engagementRangeStaleTimeMs(params),
    gcTime: 15 * 60 * 1000,
    retry: false,
  });
}

export function useAcknowledgePerformanceWarning(ref: string | null) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ref) throw new Error('User ref required');
      return postAcknowledgePerformanceWarning(client, ref);
    },
    onSuccess: (data) => {
      if (ref) {
        queryClient.invalidateQueries({ queryKey: [...USER_TARGET_QUERY_KEY_PREFIX, ref] });
        queryClient.invalidateQueries({ queryKey: ['user', ref] });
        queryClient.invalidateQueries({ queryKey: ['user', 'sub-threshold-calls'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
      const { profileData, startSession } = useSessionStore.getState();
      const tw = profileData?.targetWarnings;
      if (profileData != null && tw != null && typeof tw.level === 'number') {
        if (data.targetWarnings != null) {
          startSession({
            profileData: {
              ...profileData,
              targetWarnings: data.targetWarnings,
            },
          });
        } else {
          startSession({
            profileData: {
              ...profileData,
              targetWarnings: {
                ...tw,
                acknowledgedLevel: tw.level,
                acknowledgedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    },
  });
}
