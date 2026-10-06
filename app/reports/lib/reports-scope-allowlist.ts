/**
 * Shared React Query key for org user list used by Reports Overview + Targets.
 * Keep identical so both tabs reuse one cache entry.
 */
import type { AxiosInstance } from 'axios';
import { type UserListItem } from '@/api/endpoints/user';
import { REPORTS_USERS_QUERY_KEY_PREFIX } from '@/api/query-keys';
import { userListItemIsActiveForReporting } from '@/lib/utils/user-has-performance-target';

export const REPORTS_USERS_QUERY_KEY = [
  ...REPORTS_USERS_QUERY_KEY_PREFIX,
  'all',
] as const;

/** Server `MAX_PAGE_LIMIT` on GET /user is 100. */
export const REPORTS_USERS_PAGE_LIMIT = 100;

/**
 * Resolve the UID allowlist for reports team scope.
 * Always includes the signed-in user; merges managedStaff from profile when present.
 *
 * Team scope with managedBranches returns null (no client-side narrowing): branch staff are resolved
 * server-side and GET /user is already scoped to self + effective team, so the fetched user list is
 * the team. Narrowing to explicit managedStaff here would hide every branch-derived staff member.
 */
export function resolveReportsAllowlistUids(opts: {
  scope: 'org' | 'team' | 'self';
  selfUid: number | null | undefined;
  managedStaff?: number[] | null | undefined;
  managedBranches?: number[] | null | undefined;
}): number[] | null {
  const { scope, selfUid, managedStaff, managedBranches } = opts;
  if (scope === 'org') return null;
  if (scope === 'team' && Array.isArray(managedBranches) && managedBranches.length > 0) {
    return null;
  }
  const set = new Set<number>();
  if (selfUid != null && Number.isFinite(Number(selfUid))) {
    set.add(Number(selfUid));
  }
  if (scope === 'team' && Array.isArray(managedStaff)) {
    for (const uid of managedStaff) {
      if (uid != null && Number.isFinite(Number(uid))) {
        set.add(Number(uid));
      }
    }
  }
  return [...set];
}

export function userUidInAllowlist(
  uid: number | null | undefined,
  allowlist: number[] | null
): boolean {
  if (allowlist == null) return true;
  if (uid == null || !Number.isFinite(Number(uid))) return false;
  return allowlist.includes(Number(uid));
}

/** Active org users for Reports. One slim roster page (max 500) instead of paging GET /user. */
export async function fetchReportsOrgUsers(
  client: AxiosInstance
): Promise<UserListItem[]> {
  const { data } = await client.get<{ data?: UserListItem[] }>('/user/roster?limit=500');
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.filter(userListItemIsActiveForReporting);
}
