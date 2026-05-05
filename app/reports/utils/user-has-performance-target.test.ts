import { describe, expect, it } from 'vitest';
import { WorkforceType } from '@/api/types/user';
import {
  filterVisitExportItemsByReportingUserUids,
  userHasPerformanceTarget,
  userListItemHasPerformanceTarget,
  userListItemInLeadsVisitsReportingCohort,
} from './user-has-performance-target';

describe('userHasPerformanceTarget', () => {
  it('returns false for null/undefined', () => {
    expect(userHasPerformanceTarget(null)).toBe(false);
    expect(userHasPerformanceTarget(undefined)).toBe(false);
  });

  it('returns false when all targets are zero or missing', () => {
    expect(userHasPerformanceTarget({})).toBe(false);
    expect(
      userHasPerformanceTarget({
        targetCalls: 0,
        targetCheckIns: 0,
        targetNewLeads: 0,
      })
    ).toBe(false);
  });

  it('returns true when any performance target is positive', () => {
    expect(userHasPerformanceTarget({ targetCalls: 1 })).toBe(true);
    expect(userHasPerformanceTarget({ targetCheckIns: 2 })).toBe(true);
    expect(userHasPerformanceTarget({ targetNewLeads: 3 })).toBe(true);
  });

  it('parses string numerics from API', () => {
    expect(
      userHasPerformanceTarget({ targetNewLeads: '5' as unknown as number })
    ).toBe(true);
  });
});

describe('userListItemHasPerformanceTarget', () => {
  it('reads nested userTarget', () => {
    expect(
      userListItemHasPerformanceTarget({
        uid: 1,
        name: 'a',
        surname: 'b',
        email: 'a@b.c',
        userTarget: { targetCalls: 1 },
      })
    ).toBe(true);
    expect(
      userListItemHasPerformanceTarget({
        uid: 2,
        name: 'a',
        surname: 'b',
        email: 'a@b.c',
      })
    ).toBe(false);
  });
});

describe('userListItemInLeadsVisitsReportingCohort', () => {
  const base = {
    uid: 1,
    name: 'a',
    surname: 'b',
    email: 'a@b.c',
    userTarget: { targetCalls: 1 },
  };

  it('excludes general_worker even with targets', () => {
    expect(
      userListItemInLeadsVisitsReportingCohort({
        ...base,
        workforceType: WorkforceType.GENERAL_WORKER,
      })
    ).toBe(false);
  });

  it('includes non–general-worker with targets', () => {
    expect(
      userListItemInLeadsVisitsReportingCohort({
        ...base,
        workforceType: WorkforceType.INTERNAL_SALES_REP,
      })
    ).toBe(true);
  });
});

describe('filterVisitExportItemsByReportingUserUids', () => {
  const items = [
    { owner: { uid: 1 } },
    { owner: { uid: 2 } },
    { owner: {} },
  ] as import('@/api/types/reports').VisitExportItem[];

  it('no-ops when apply is false', () => {
    expect(
      filterVisitExportItemsByReportingUserUids(items, new Set([1]), false)
    ).toEqual(items);
  });

  it('filters by allowed uids', () => {
    const out = filterVisitExportItemsByReportingUserUids(
      items,
      new Set([2]),
      true
    );
    expect(out).toHaveLength(1);
    expect((out[0].owner as { uid: number }).uid).toBe(2);
  });
});
