/**
 * Shared React Query key for org user list used by Reports Overview + Targets.
 * Keep identical so both tabs reuse one cache entry.
 */
import type { AxiosInstance } from 'axios';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
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
 */
export function resolveReportsAllowlistUids(opts: {
  scope: 'org' | 'team' | 'self';
  selfUid: number | null | undefined;
  managedStaff?: number[] | null | undefined;
}): number[] | null {
  const { scope, selfUid, managedStaff } = opts;
  if (scope === 'org') return null;
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

/** Active org users for Reports (matches Staff daily overview cohort). */
export async function fetchReportsOrgUsers(
  client: AxiosInstance
): Promise<UserListItem[]> {
  const all: UserListItem[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await getUsers(client, {
      page,
      limit: REPORTS_USERS_PAGE_LIMIT,
      status: 'active',
    });
    const chunk = Array.isArray(res?.data) ? res.data : [];
    all.push(...chunk);
    totalPages = Math.max(1, Number(res?.meta?.totalPages) || 1);
    if (chunk.length === 0) break;
    page += 1;
    if (page > 50) break;
  }
  return all.filter(userListItemIsActiveForReporting);
}
