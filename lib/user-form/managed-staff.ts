import type { UserListItem } from '@/api/endpoints/user';

/** Primary branch uid of a listed user (relation first, flat column as fallback). */
export function getUserPrimaryBranchUid(user: UserListItem): number | null {
  const raw = user.branch?.uid ?? user.branchUid ?? null;
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Staff who join a manager's team automatically because they work in one of the
 * manager's managed branches. Mirrors the server (`resolveTeamAssignments`): active users only,
 * excluding the manager, so the form never shows people the API will not actually return.
 */
export function getStaffInheritedFromBranches(
  users: readonly UserListItem[],
  managedBranchUids: readonly number[] | null | undefined,
  managerUid: number | null | undefined
): UserListItem[] {
  if (!managedBranchUids?.length) return [];
  const branches = new Set(managedBranchUids);
  return users.filter((u) => {
    if (managerUid != null && u.uid === managerUid) return false;
    if (typeof u.status === 'string' && u.status !== 'active') return false;
    const branchUid = getUserPrimaryBranchUid(u);
    return branchUid != null && branches.has(branchUid);
  });
}

/** Drop explicitly-assigned staff who are already covered by a managed branch (no double assignment). */
export function pruneStaffCoveredByBranches(
  managedStaff: readonly number[] | null | undefined,
  inheritedStaff: readonly UserListItem[]
): number[] {
  const covered = new Set(inheritedStaff.map((u) => u.uid));
  return (managedStaff ?? []).filter((uid) => !covered.has(uid));
}
