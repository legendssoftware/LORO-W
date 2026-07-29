/**
 * Resolve a user's primary attached branch UID for reports filtering.
 * Prefer flat `branchUid` (matches session auth / users.branchUid column);
 * fall back to nested `branch.uid` on list payloads when the column is absent.
 */
export function resolveUserBranchUid(user: {
  branch?: { uid?: number | null } | null;
  branchUid?: unknown;
}): number | null {
  if (typeof user.branchUid === 'number' && Number.isFinite(user.branchUid)) {
    return user.branchUid > 0 ? user.branchUid : null;
  }
  if (typeof user.branchUid === 'string' && user.branchUid.trim() !== '') {
    const n = Number(user.branchUid);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (user.branch?.uid != null && Number.isFinite(Number(user.branch.uid))) {
    const n = Number(user.branch.uid);
    return n > 0 ? n : null;
  }
  return null;
}

/** True when no branch filter is active, or the user belongs to that branch. */
export function userMatchesBranchFilter(
  user: {
    branch?: { uid?: number | null } | null;
    branchUid?: unknown;
  },
  branchId: number | null | undefined
): boolean {
  if (branchId == null) return true;
  return resolveUserBranchUid(user) === branchId;
}

/** Narrow a user list to those attached to `branchId` (or all when null). */
export function filterUsersByBranch<T extends {
  branch?: { uid?: number | null } | null;
  branchUid?: unknown;
}>(users: T[], branchId: number | null | undefined): T[] {
  if (branchId == null) return users;
  return users.filter((u) => userMatchesBranchFilter(u, branchId));
}

/** UID set for users attached to the selected branch (empty when branchId is null). */
export function userIdsMatchingBranch(
  users: Array<{
    uid: number;
    branch?: { uid?: number | null } | null;
    branchUid?: unknown;
  }>,
  branchId: number | null | undefined
): Set<number> | null {
  if (branchId == null) return null;
  const set = new Set<number>();
  for (const u of users) {
    if (userMatchesBranchFilter(u, branchId) && Number.isFinite(Number(u.uid))) {
      set.add(Number(u.uid));
    }
  }
  return set;
}

/**
 * Map owner uid → primary branch uid from the org user list.
 * Used to enrich visit/check-in rows that omit nested owner.branch.
 */
export function buildOwnerBranchUidMap(
  users: Array<{
    uid: number;
    branch?: { uid?: number | null } | null;
    branchUid?: unknown;
  }>
): Map<number, number> {
  const map = new Map<number, number>();
  for (const u of users) {
    const branchUid = resolveUserBranchUid(u);
    if (branchUid != null && Number.isFinite(Number(u.uid))) {
      map.set(Number(u.uid), branchUid);
    }
  }
  return map;
}
