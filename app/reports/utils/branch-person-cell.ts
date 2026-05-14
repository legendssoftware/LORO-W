import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import {
  getCountryFlag,
  normalizeBranchCountryCodeForGrouping,
} from '@/lib/utils/country-flags';

export function branchUidFromListUser(u: UserListItem | undefined): number | null {
  if (!u) return null;
  const raw = u as { branchUid?: number | null; branch?: { uid?: number } | null };
  if (typeof raw.branchUid === 'number' && raw.branchUid > 0) return raw.branchUid;
  const bu = raw.branch?.uid;
  if (typeof bu === 'number' && bu > 0) return bu;
  return null;
}

export function branchFlagAndLabel(
  listUser: UserListItem | undefined,
  branchByUid: Map<number, BranchListItem>
): { flag: string; label: string } {
  const uid = branchUidFromListUser(listUser);
  if (uid == null) {
    return { flag: getCountryFlag('UNLISTED').flag, label: 'Unassigned' };
  }
  const b = branchByUid.get(uid);
  if (!b) {
    return { flag: getCountryFlag('SA').flag, label: `Branch #${uid}` };
  }
  return {
    flag: getCountryFlag(normalizeBranchCountryCodeForGrouping(b)).flag,
    label: getBranchDisplayLabel(b),
  };
}
