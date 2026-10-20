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
  const active = rows.filter(userListItemIsActiveForReporting);
  // #region agent log
  const sample = active.slice(0, 8).map((user) => {
    const ut = (user.userTarget ?? null) as Record<string, unknown> | null;
    return {
      uid: user.uid,
      targetKeys: ut ? Object.keys(ut) : [],
      targetSalesAmount: ut?.targetSalesAmount ?? null,
      targetHoursWorked: ut?.targetHoursWorked ?? null,
      targetQuotationsAmount: ut?.targetQuotationsAmount ?? null,
      targetCalls: ut?.targetCalls ?? null,
    };
  });
  fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06c950'},body:JSON.stringify({sessionId:'06c950',runId:'pre-fix',hypothesisId:'A',location:'reports-scope-allowlist.ts:fetchReportsOrgUsers',message:'roster target fields',data:{count:active.length,withSalesTarget:sample.filter((row)=>Number(row.targetSalesAmount)>0).length,sample},timestamp:Date.now()})}).catch(()=>{});
  // #region agent log
  const dateSample = active.slice(0, 12).map((user) => {
    const ut = (user.userTarget ?? null) as Record<string, unknown> | null;
    return {
      uid: user.uid,
      hasTarget: ut != null,
      targetSalesAmount: ut?.targetSalesAmount ?? null,
      periodStartDate: ut?.periodStartDate ?? null,
      periodEndDate: ut?.periodEndDate ?? null,
      keys: ut ? Object.keys(ut) : [],
    };
  });
  fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7255bc'},body:JSON.stringify({sessionId:'7255bc',runId:'pre-fix',hypothesisId:'A',location:'reports-scope-allowlist.ts:fetchReportsOrgUsers',message:'roster sales target and period dates',data:{count:active.length,withSalesTarget:dateSample.filter((row)=>Number(row.targetSalesAmount)>0).length,withPeriod:dateSample.filter((row)=>row.periodStartDate!=null&&row.periodEndDate!=null).length,dateSample},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  // #endregion
  return active;
}
