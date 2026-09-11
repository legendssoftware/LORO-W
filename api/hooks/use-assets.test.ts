import { describe, expect, it } from 'vitest';
import type { AssetRecord } from '@/api/types/asset';
import {
  collectVehicleAssignmentsElsewhere,
  filterAvailableVehicles,
} from './use-assets';
import type { UserListItem } from '@/api/endpoints/user';

function vehicle(uid: number): AssetRecord {
  return {
    uid,
    category: 'VEHICLE',
    brand: 'Toyota',
    serialNumber: `SN-${uid}`,
    modelNumber: 'Hilux',
  };
}

describe('filterAvailableVehicles', () => {
  const fleet = [vehicle(1), vehicle(2), vehicle(3)];

  it('keeps pinned assigned UIDs even when marked assigned elsewhere', () => {
    const available = filterAvailableVehicles(fleet, new Set([2, 3]), [2]);
    expect(available.map((a) => a.uid)).toEqual([1, 2]);
  });

  it('keeps both pinned primary and secondary UIDs', () => {
    const available = filterAvailableVehicles(fleet, new Set([1, 2, 3]), [1, 3]);
    expect(available.map((a) => a.uid)).toEqual([1, 3]);
  });
});

describe('collectVehicleAssignmentsElsewhere', () => {
  it('skips the current user and collects other assignments', () => {
    const users = [
      {
        uid: 10,
        userTarget: { primaryVehicleAssetUid: 1, secondaryVehicleAssetUid: 2 },
      },
      {
        uid: 11,
        userTarget: { primaryVehicleAssetUid: 3 },
      },
    ] as UserListItem[];

    const assigned = collectVehicleAssignmentsElsewhere(users, 10);
    expect([...assigned].sort()).toEqual([3]);
  });
});
