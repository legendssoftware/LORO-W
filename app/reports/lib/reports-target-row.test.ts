import { describe, expect, it } from 'vitest';
import {
  applyEngagementToRow,
  applyQuotationsEngagementToRow,
  applyTravelToRow,
  enrichRowWithTargetDashboard,
  overlayTargetRowFilters,
  resolveTargetPeriodEngagementParams,
  rowFromUserListItem,
  targetRowFromUserListItem,
  totalEngagementCheckIns,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import type { UserListItem } from '@/api/endpoints/user';

function baseRow(overrides: Partial<ReportsTargetRow> = {}): ReportsTargetRow {
  return {
    key: 'u1',
    userId: 1,
    ref: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    calls: { current: 0, target: 1200, progress: 0 },
    visits: { current: 0, target: 160, progress: 0 },
    leads: { current: 0, target: 1200, progress: 0 },
    quotations: { current: 0, target: 50000, progress: 0, currency: 'ZAR' },
    sales: { current: 0, target: 500000, progress: 0, currency: 'ZAR' },
    hours: { current: 0, target: 180, progress: 0 },
    productivity: { score: null },
    travel: {
      distanceKm: 0,
      visitCount: 0,
      petrolClaimCount: 0,
      petrolClaimAmount: 0,
      fuelAllowance: 0,
      progress: 0,
    },
    achievement: 0,
    engagementMet: false,
    targetWarnings: null,
    periodStartDate: '2026-08-01',
    periodEndDate: '2026-08-31',
    ...overrides,
  };
}

describe('totalEngagementCheckIns', () => {
  it('sums call and visit counts', () => {
    expect(totalEngagementCheckIns({ callCount: 2, visitCount: 3 })).toBe(5);
  });
});

describe('applyEngagementToRow', () => {
  it('keeps calls and visits separate when a date range is applied', () => {
    const row = baseRow();
    const next = applyEngagementToRow(
      row,
      { callCount: 0, visitCount: 1, leadCount: 0, quotationCount: 1, quotationAmount: 12500 },
      '2026-08-07',
      '2026-08-07'
    );
    expect(next.calls.current).toBe(0);
    expect(next.visits.current).toBe(1);
    expect(next.leads.current).toBe(0);
    expect(next.quotations.current).toBe(1);
    expect(next.quotations.amountCurrent).toBe(12500);
  });

  it('prorates calls to 60/day when period target is 1200 (single weekday)', () => {
    const row = baseRow({
      calls: { current: 0, target: 1200, progress: 0 },
      periodStartDate: '2026-03-01',
      periodEndDate: '2026-03-31',
    });
    const next = applyEngagementToRow(
      row,
      { callCount: 5, leadCount: 0, visitCount: 0 },
      '2026-03-02',
      '2026-03-02'
    );
    expect(next.calls.target).toBe(60);
  });

  it('must not apply engagement overlay twice (1200 → 60 → 3)', () => {
    const row = baseRow({
      calls: { current: 0, target: 1200, progress: 0 },
      periodStartDate: '2026-03-01',
      periodEndDate: '2026-03-31',
    });
    const once = applyEngagementToRow(
      row,
      { callCount: 0, leadCount: 0, visitCount: 0 },
      '2026-03-02',
      '2026-03-02'
    );
    const twice = applyEngagementToRow(
      once,
      { callCount: 0, leadCount: 0, visitCount: 0 },
      '2026-03-02',
      '2026-03-02'
    );
    expect(once.calls.target).toBe(60);
    expect(twice.calls.target).toBe(3);
  });

  it('prorates visit and quotation targets for a single-day range', () => {
    const row = baseRow({
      visits: { current: 0, target: 160, progress: 0 },
      quotations: {
        current: 0,
        target: 50000,
        amountCurrent: 2500,
        progress: 5,
        currency: 'ZAR',
      },
    });
    const next = applyEngagementToRow(
      row,
      {
        callCount: 5,
        visitCount: 1,
        leadCount: 2,
        quotationCount: 2,
        quotationAmount: 8000,
      },
      '2026-08-07',
      '2026-08-07'
    );
    expect(next.visits.target).toBeGreaterThan(0);
    expect(next.visits.target).toBeLessThan(row.visits.target);
    expect(next.quotations.current).toBe(2);
    expect(next.quotations.amountCurrent).toBe(8000);
    expect(next.quotations.target).toBeGreaterThan(0);
    expect(next.quotations.target).toBeLessThan(row.quotations.target);
  });
});

describe('rowFromUserListItem', () => {
  it('maps check-ins and quotations from nested userTarget', () => {
    const user = {
      uid: 42,
      name: 'Tian',
      surname: 'Geyer',
      email: 'tian@example.com',
      userTarget: {
        targetCalls: 1200,
        currentCalls: 10,
        targetCheckIns: 160,
        currentCheckIns: 3,
        targetNewLeads: 1200,
        currentNewLeads: 5,
        targetQuotationsAmount: 50000,
        currentQuotationsAmount: 12000,
        targetSalesAmount: 500000,
        currentSalesAmount: 100000,
        targetHoursWorked: 180,
        currentHoursWorked: 40,
        targetCurrency: 'ZAR',
      },
    } as UserListItem;

    const row = rowFromUserListItem(user);
    expect(row.calls.current).toBe(10);
    expect(row.visits.current).toBe(3);
    expect(row.quotations.current).toBe(0);
    expect(row.quotations.amountCurrent).toBe(12000);
    expect(row.quotations.currency).toBe('ZAR');
  });
});

describe('overlayTargetRowFilters', () => {
  it('skips engagement overlay when engagement is not ready', () => {
    const row = baseRow({ calls: { current: 99, target: 1200, progress: 8 } });
    const next = overlayTargetRowFilters(row, {
      rangeParams: { from: '2026-08-07', to: '2026-08-07' },
      engagement: { callCount: 0, visitCount: 1, leadCount: 0, quotationCount: 0, quotationAmount: 0 },
      engagementReady: false,
    });
    expect(next.calls.current).toBe(99);
  });

  it('applies engagement when ready', () => {
    const row = baseRow();
    const next = overlayTargetRowFilters(row, {
      rangeParams: { from: '2026-08-07', to: '2026-08-07' },
      engagement: { callCount: 2, visitCount: 1, leadCount: 3, quotationCount: 1, quotationAmount: 500 },
      engagementReady: true,
    });
    expect(next.calls.current).toBe(2);
    expect(next.visits.current).toBe(1);
    expect(next.quotations.current).toBe(1);
  });
});

describe('targetRowFromUserListItem', () => {
  it('builds shell row without engagement when not ready', () => {
    const user = {
      uid: 7,
      name: 'A',
      surname: 'B',
      email: 'a@b.com',
      userTarget: { targetCalls: 100, currentCalls: 5 },
    } as UserListItem;
    const row = targetRowFromUserListItem(user, {
      rangeParams: { from: '2026-08-07', to: '2026-08-07' },
      engagementReady: false,
    });
    expect(row.calls.current).toBe(5);
    expect(row.periodLabel).toContain('2026');
  });
});

describe('resolveTargetPeriodEngagementParams', () => {
  it('caps end at today and returns from/to', () => {
    const result = resolveTargetPeriodEngagementParams(
      [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31' }],
      { today: new Date('2026-08-07T12:00:00.000Z') }
    );
    expect(result).toEqual({ from: '2026-08-01', to: '2026-08-07' });
  });

  it('returns null when period dates are missing', () => {
    expect(resolveTargetPeriodEngagementParams([{}])).toBeNull();
  });
});

describe('applyTravelToRow', () => {
  it('sets distance and prorates fuel allowance for a single weekday', () => {
    const row = baseRow({
      visits: { current: 12, target: 160, progress: 8 },
      periodStartDate: '2026-03-01',
      periodEndDate: '2026-03-31',
    });
    const next = applyTravelToRow(
      row,
      {
        distanceKm: 48.21,
        petrolClaimCount: 2,
        petrolClaimAmount: 1240,
        fuelAllowance: 5000,
      },
      '2026-03-02',
      '2026-03-02'
    );
    expect(next.travel.distanceKm).toBe(48.2);
    expect(next.travel.visitCount).toBe(12);
    expect(next.travel.petrolClaimCount).toBe(2);
    expect(next.travel.petrolClaimAmount).toBe(1240);
    expect(next.travel.fuelAllowance).toBeGreaterThan(0);
    expect(next.travel.fuelAllowance).toBeLessThan(5000);
    expect(next.travel.progress).toBeGreaterThan(0);
  });

  it('shows 0% when fuel allowance is 0', () => {
    const next = applyTravelToRow(baseRow(), {
      distanceKm: 10,
      petrolClaimCount: 1,
      petrolClaimAmount: 400,
      fuelAllowance: 0,
    });
    expect(next.travel.progress).toBe(0);
    expect(next.travel.fuelAllowance).toBe(0);
  });
});

describe('applyQuotationsEngagementToRow', () => {
  it('updates quotation count and amount without changing calls', () => {
    const row = baseRow({
      calls: { current: 10, target: 1200, progress: 1 },
      quotations: { current: 0, target: 50000, amountCurrent: 12000, progress: 24, currency: 'ZAR' },
    });
    const next = applyQuotationsEngagementToRow(row, {
      quotationCount: 3,
      quotationAmount: 15000,
    });
    expect(next.calls.current).toBe(10);
    expect(next.quotations.current).toBe(3);
    expect(next.quotations.amountCurrent).toBe(15000);
    expect(next.quotations.progress).toBe(30);
  });
});

describe('overlayTargetRowFilters travel', () => {
  it('overlays distance and prorated fuel after engagement visits', () => {
    const row = baseRow({
      visits: { current: 0, target: 160, progress: 0 },
    });
    const next = overlayTargetRowFilters(row, {
      rangeParams: { from: '2026-08-10', to: '2026-08-15' },
      engagement: {
        callCount: 0,
        visitCount: 12,
        leadCount: 0,
        quotationCount: 0,
        quotationAmount: 0,
      },
      engagementReady: true,
      travel: {
        distanceKm: 48.2,
        petrolClaimCount: 2,
        petrolClaimAmount: 1240,
        fuelAllowance: 5000,
      },
      travelReady: true,
    });
    expect(next.visits.current).toBe(12);
    expect(next.travel.distanceKm).toBe(48.2);
    expect(next.travel.visitCount).toBe(12);
    expect(next.travel.petrolClaimAmount).toBe(1240);
    expect(next.travel.fuelAllowance).toBeGreaterThan(0);
    expect(next.travel.fuelAllowance).toBeLessThan(5000);
  });
});

describe('overlayTargetRowFilters quotationsOnly', () => {
  it('applies quotation overlay in all-time mode without changing calls', () => {
    const row = baseRow({
      calls: { current: 10, target: 1200, progress: 1 },
      quotations: { current: 0, target: 50000, amountCurrent: 12000, progress: 24, currency: 'ZAR' },
    });
    const next = overlayTargetRowFilters(row, {
      rangeParams: null,
      engagement: {
        callCount: 99,
        visitCount: 5,
        leadCount: 8,
        quotationCount: 2,
        quotationAmount: 8000,
      },
      engagementReady: true,
      engagementMode: 'quotationsOnly',
      engagementRangeParams: { from: '2026-08-01', to: '2026-08-07' },
    });
    expect(next.calls.current).toBe(10);
    expect(next.quotations.current).toBe(2);
    expect(next.quotations.amountCurrent).toBe(8000);
  });
});

describe('enrichRowWithTargetDashboard preserveRangeMetrics', () => {
  it('keeps engagement quotation count when preserveRangeMetrics is true', () => {
    const row = baseRow({
      calls: { current: 2, target: 1200, progress: 0 },
      visits: { current: 1, target: 160, progress: 1 },
      leads: { current: 3, target: 1200, progress: 0 },
      quotations: {
        current: 4,
        target: 50000,
        amountCurrent: 9000,
        progress: 18,
        currency: 'ZAR',
      },
    });
    const next = enrichRowWithTargetDashboard(
      row,
      {
        personalTargets: {
          calls: { current: 99, target: 1200, progress: 8 },
          checkIns: { current: 88, target: 160, progress: 55 },
          newLeads: { current: 77, target: 1200, progress: 6 },
          quotations: { current: 66000, target: 50000, progress: 100, currency: 'ZAR' },
        },
      },
      { preserveRangeMetrics: true }
    );
    expect(next.calls.current).toBe(2);
    expect(next.visits.current).toBe(1);
    expect(next.leads.current).toBe(3);
    expect(next.quotations.current).toBe(4);
    expect(next.quotations.amountCurrent).toBe(9000);
    expect(next.travel.visitCount).toBe(1);
  });

  it('keeps Travel visitCount aligned with Visits after dashboard overwrite', () => {
    const row = baseRow({
      visits: { current: 12, target: 160, progress: 8 },
      travel: {
        distanceKm: 48.2,
        visitCount: 12,
        petrolClaimCount: 2,
        petrolClaimAmount: 1240,
        fuelAllowance: 500,
        progress: 40,
      },
    });
    const next = enrichRowWithTargetDashboard(row, {
      personalTargets: {
        checkIns: { current: 88, target: 160, progress: 55 },
      },
    });
    expect(next.visits.current).toBe(88);
    expect(next.travel.visitCount).toBe(88);
    expect(next.travel.distanceKm).toBe(48.2);
  });
});
