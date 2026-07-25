import type { BranchListItem } from '@/api/types/branch';

/** Region string for filters (branch address city/state/postal/country). */
export function regionKeyFromBranch(
  branchUid: number | null | undefined,
  branches: BranchListItem[]
): string {
  if (branchUid == null) return 'Not set';
  const b = branches.find((x) => x.uid === branchUid);
  if (!b?.address) return 'Not set';
  const { city, state, postalCode, country } = b.address;
  const fromStructured = [city, state, postalCode, country].filter(Boolean).join(', ').trim();
  return fromStructured || 'Not set';
}
