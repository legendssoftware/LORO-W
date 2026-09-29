import { describe, expect, it } from 'vitest';
import type { UserListItem } from '@/api/endpoints/user';
import {
  getStaffInheritedFromBranches,
  getUserPrimaryBranchUid,
  pruneStaffCoveredByBranches,
} from './managed-staff';

function makeUser(uid: number, over: Partial<UserListItem> = {}): UserListItem {
  return { uid, name: `User${uid}`, surname: 'Test', email: `u${uid}@x.com`, ...over };
}

describe('getUserPrimaryBranchUid', () => {
  it('prefers the branch relation, falls back to branchUid, and rejects junk', () => {
    expect(getUserPrimaryBranchUid(makeUser(1, { branch: { uid: 5 } }))).toBe(5);
    expect(getUserPrimaryBranchUid(makeUser(1, { branchUid: 7 }))).toBe(7);
    expect(getUserPrimaryBranchUid(makeUser(1, { branchUid: 0 }))).toBeNull();
    expect(getUserPrimaryBranchUid(makeUser(1))).toBeNull();
  });
});

describe('getStaffInheritedFromBranches', () => {
  const users = [
    makeUser(1, { branch: { uid: 10 } }), // the manager
    makeUser(2, { branch: { uid: 10 } }),
    makeUser(3, { branchUid: 11 }),
    makeUser(4, { branch: { uid: 99 } }),
    makeUser(5, { branch: { uid: 10 }, status: 'inactive' }),
    makeUser(6),
  ];

  it('returns active staff of the managed branches, excluding the manager', () => {
    const result = getStaffInheritedFromBranches(users, [10, 11], 1);
    expect(result.map((u) => u.uid)).toEqual([2, 3]);
  });

  it('returns nothing when no branches are managed', () => {
    expect(getStaffInheritedFromBranches(users, [], 1)).toEqual([]);
    expect(getStaffInheritedFromBranches(users, undefined, 1)).toEqual([]);
  });
});

describe('pruneStaffCoveredByBranches', () => {
  it('removes explicit staff that a managed branch already covers', () => {
    const inherited = [makeUser(2), makeUser(3)];
    expect(pruneStaffCoveredByBranches([2, 4, 3, 8], inherited)).toEqual([4, 8]);
  });

  it('handles empty input', () => {
    expect(pruneStaffCoveredByBranches(undefined, [])).toEqual([]);
  });
});
