import { describe, expect, it } from 'vitest';
import {
  buildUserTargetPatchBody,
  fillPrimaryVehicleUidFromOwned,
  getDefaultTargetValues,
  preserveAssignedVehicleUids,
} from './build-patch-body';
import type { TargetFormValues } from './schemas';

function withVehicles(
  values: TargetFormValues,
  primary: number | null,
  secondary: number | null
): TargetFormValues {
  return {
    ...values,
    primaryVehicleAssetUid: primary,
    secondaryVehicleAssetUid: secondary,
  };
}

describe('getDefaultTargetValues', () => {
  it('reads vehicle UIDs from root userTarget', () => {
    const values = getDefaultTargetValues({
      primaryVehicleAssetUid: 42,
      secondaryVehicleAssetUid: 43,
    });
    expect(values.primaryVehicleAssetUid).toBe(42);
    expect(values.secondaryVehicleAssetUid).toBe(43);
  });

  it('prefers root vehicle UIDs over personalTargets', () => {
    const values = getDefaultTargetValues({
      primaryVehicleAssetUid: 42,
      secondaryVehicleAssetUid: 43,
      personalTargets: {
        primaryVehicleAssetUid: null,
        secondaryVehicleAssetUid: null,
        targetCalls: 10,
      },
    });
    expect(values.primaryVehicleAssetUid).toBe(42);
    expect(values.secondaryVehicleAssetUid).toBe(43);
    expect(values.targetCalls).toBe(10);
  });

  it('reads vehicle UIDs from personalTargets when root is unset', () => {
    const values = getDefaultTargetValues({
      personalTargets: {
        primaryVehicleAssetUid: 7,
        secondaryVehicleAssetUid: 8,
      },
    });
    expect(values.primaryVehicleAssetUid).toBe(7);
    expect(values.secondaryVehicleAssetUid).toBe(8);
  });

  it('parses vehicle UIDs from numeric strings', () => {
    const values = getDefaultTargetValues({
      primaryVehicleAssetUid: '42',
      secondaryVehicleAssetUid: '43',
    });
    expect(values.primaryVehicleAssetUid).toBe(42);
    expect(values.secondaryVehicleAssetUid).toBe(43);
  });
});

describe('preserveAssignedVehicleUids', () => {
  const empty = getDefaultTargetValues(null);

  it('keeps current UIDs on same-user refetch when incoming is null', () => {
    const merged = preserveAssignedVehicleUids(
      empty,
      { primaryVehicleAssetUid: 42, secondaryVehicleAssetUid: 43 },
      { sameUser: true }
    );
    expect(merged.primaryVehicleAssetUid).toBe(42);
    expect(merged.secondaryVehicleAssetUid).toBe(43);
  });

  it('does not copy UIDs from a previous user', () => {
    const merged = preserveAssignedVehicleUids(
      empty,
      { primaryVehicleAssetUid: 42, secondaryVehicleAssetUid: 43 },
      { sameUser: false }
    );
    expect(merged.primaryVehicleAssetUid).toBeNull();
    expect(merged.secondaryVehicleAssetUid).toBeNull();
  });
});

describe('fillPrimaryVehicleUidFromOwned', () => {
  it('keeps an existing primary assignment', () => {
    expect(fillPrimaryVehicleUidFromOwned(9, null, [1, 2])).toBe(9);
  });

  it('uses the first owned vehicle when primary is unset', () => {
    expect(fillPrimaryVehicleUidFromOwned(null, null, [11, 12])).toBe(11);
  });

  it('skips the secondary vehicle when filling from owned', () => {
    expect(fillPrimaryVehicleUidFromOwned(null, 11, [11, 12])).toBe(12);
  });

  it('does not fill after the user cleared primary', () => {
    expect(fillPrimaryVehicleUidFromOwned(null, null, [11], true)).toBeNull();
  });
});

describe('buildUserTargetPatchBody', () => {
  const empty = getDefaultTargetValues(null);

  it('includes assigned vehicle UIDs when they differ from baseline', () => {
    const body = buildUserTargetPatchBody(
      empty,
      withVehicles(empty, 42, 43)
    );
    expect(body?.primaryVehicleAssetUid).toBe(42);
    expect(body?.secondaryVehicleAssetUid).toBe(43);
  });

  it('sends null to clear vehicle assignments', () => {
    const body = buildUserTargetPatchBody(
      withVehicles(empty, 42, 43),
      withVehicles(empty, null, null)
    );
    expect(body?.primaryVehicleAssetUid).toBeNull();
    expect(body?.secondaryVehicleAssetUid).toBeNull();
  });

  it('includes vehicle keys when marked dirty even if values match', () => {
    const assigned = withVehicles(empty, 42, null);
    const body = buildUserTargetPatchBody(assigned, assigned, {
      primaryVehicleAssetUid: true,
    });
    expect(body?.primaryVehicleAssetUid).toBe(42);
  });
});
