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
