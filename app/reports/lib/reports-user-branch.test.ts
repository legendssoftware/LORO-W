import { describe, expect, it } from 'vitest';
import {
  filterUsersByBranch,
  resolveUserBranchUid,
  userMatchesBranchFilter,
} from './reports-user-branch';

describe('resolveUserBranchUid', () => {
  it('prefers nested branch.uid over stale flat branchUid', () => {
    expect(
      resolveUserBranchUid({ branch: { uid: 5 }, branchUid: 9 })
    ).toBe(5);
  });

  it('falls back to branchUid when branch relation is absent', () => {
    expect(resolveUserBranchUid({ branch: null, branchUid: 5 })).toBe(5);
  });

  it('returns null when neither branch nor branchUid is set', () => {
    expect(resolveUserBranchUid({ branch: null, branchUid: null })).toBeNull();
  });

  it('parses string branchUid when branch is missing', () => {
    expect(resolveUserBranchUid({ branchUid: '12' })).toBe(12);
  });

  it('ignores zero or invalid branch values', () => {
    expect(
      resolveUserBranchUid({ branch: { uid: 0 }, branchUid: 3 })
    ).toBe(3);
    expect(resolveUserBranchUid({ branchUid: 0 })).toBeNull();
  });
});

describe('userMatchesBranchFilter', () => {
  it('matches using branch.uid when branchUid column is stale', () => {
    const user = { branch: { uid: 5 }, branchUid: 9 };
    expect(userMatchesBranchFilter(user, 5)).toBe(true);
    expect(userMatchesBranchFilter(user, 9)).toBe(false);
  });
});

describe('filterUsersByBranch', () => {
  const users = [
    { uid: 1, branch: { uid: 5 }, branchUid: 9 },
    { uid: 2, branch: { uid: 7 }, branchUid: 7 },
  ];

  it('returns all users when branchId is null', () => {
    expect(filterUsersByBranch(users, null)).toHaveLength(2);
  });

  it('filters by nested branch.uid', () => {
    expect(filterUsersByBranch(users, 5)).toEqual([users[0]]);
    expect(filterUsersByBranch(users, 7)).toEqual([users[1]]);
  });
});
