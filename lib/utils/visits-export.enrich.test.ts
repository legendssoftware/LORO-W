import { describe, expect, it } from 'vitest';
import type { VisitListItem } from '@/api/types/visits';
import {
  getVisitBranchUid,
  mapCheckInsFromApi,
  resolveBranchChartLabel,
} from '@/lib/utils/visits-export';

describe('enrichVisitsWithUserBranches / mapCheckInsFromApi', () => {
  it('preserves snapshot branch uid when owner current branch differs', () => {
    const checkIns: VisitListItem[] = [
      {
        uid: 100,
        checkInTime: '2025-01-15T10:00:00.000Z',
        branch: { uid: 1 },
        owner: {
          uid: 10,
          name: 'Test',
          surname: 'User',
          branch: { uid: 2, name: 'Other branch' },
        },
      },
    ];
    const users = [
      {
        uid: 10,
        branch: { uid: 2, name: 'Other branch' },
      },
    ];
    const out = mapCheckInsFromApi(checkIns, users, []);
    expect(out).toHaveLength(1);
    expect(getVisitBranchUid(out[0])).toBe(1);
    expect(out[0].branch?.uid).toBe(1);
  });

  it('fills name from org branches list when snapshot uid matches', () => {
    const checkIns: VisitListItem[] = [
      {
        uid: 101,
        checkInTime: '2025-01-15T10:00:00.000Z',
        branch: { uid: 1 },
        owner: { uid: 11, name: 'A', surname: 'B' },
      },
    ];
    const branches = [{ uid: 1, name: 'Johannesburg HQ' }];
    const out = mapCheckInsFromApi(checkIns, [], branches);
    expect(out[0].branch?.name).toBe('Johannesburg HQ');
    expect(getVisitBranchUid(out[0])).toBe(1);
  });

  it('resolveBranchChartLabel uses org list name for uid', () => {
    const v = {
      branch: { uid: 1, name: 'Stale snapshot name' },
      owner: {},
    } as VisitListItem;
    const label = resolveBranchChartLabel(v, [{ uid: 1, name: 'Canonical Name' }]);
    expect(label).toBe('Canonical Name');
  });
});
