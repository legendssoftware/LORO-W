import type { UserListItem } from '@/api/endpoints/user';
import type { VisitExportItem } from '@/api/types/reports';
import { isGeneralWorkerWorkforce } from '@/lib/workforce-guards';

function targetNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Matches server `userHasPerformanceTarget` in targets-progress.service.ts:
 * UserTarget exists and at least one of calls / check-ins (visits) / new-leads period target is positive.
 */
export function userHasPerformanceTarget(
  userTarget: Record<string, unknown> | null | undefined
): boolean {
  if (!userTarget || typeof userTarget !== 'object') return false;
  return (
    targetNum(userTarget.targetCalls) > 0 ||
    targetNum(userTarget.targetCheckIns) > 0 ||
    targetNum(userTarget.targetNewLeads) > 0
  );
}

/** List user from GET /user (may include `userTarget` via partial join). */
export function userListItemHasPerformanceTarget(user: UserListItem): boolean {
  const ut = (user as Record<string, unknown>).userTarget;
  if (!ut || typeof ut !== 'object') return userHasPerformanceTarget(null);
  return userHasPerformanceTarget(ut as Record<string, unknown>);
}

/** Org leads/visits/targets reporting cohort: performance targets required, general workers excluded (matches server rollups). */
export function userListItemInLeadsVisitsReportingCohort(user: UserListItem): boolean {
  if (isGeneralWorkerWorkforce(user.workforceType)) return false;
  return userListItemHasPerformanceTarget(user);
}

export function buildReportingUserUidSet(
  users: ReadonlyArray<{ uid: number }>
): Set<number> {
  return new Set(users.map((u) => u.uid));
}

/**
 * Org "all users" scope: keep only visits whose owner uid is in the reporting set.
 * Rows without owner uid are excluded when filtering is enabled.
 */
export function filterVisitExportItemsByReportingUserUids(
  items: VisitExportItem[],
  allowedUids: Set<number>,
  apply: boolean
): VisitExportItem[] {
  if (!apply) return items;
  return items.filter((item) => {
    const uid = (item.owner as { uid?: number } | undefined)?.uid;
    if (uid == null) return false;
    return allowedUids.has(uid);
  });
}
