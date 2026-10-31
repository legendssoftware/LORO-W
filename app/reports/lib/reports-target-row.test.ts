import { describe, expect, it } from 'vitest';
import {
  applyEngagementToRow,
  applyErpSalesToRow,
  applyQuotationsEngagementToRow,
  applyTravelToRow,
  enrichRowWithTargetDashboard,
  overlayTargetRowFilters,
  policyCellForRef,
  prorateTargetForRange,
  resolveTargetPeriodEngagementParams,
  rowFromPersonalTarget,
  rowFromUserListItem,
  sumUniqueErpSales,
  targetRowFromUserListItem,
  totalEngagementCheckIns,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import type { UserListItem } from '@/api/endpoints/user';
import type { PolicyReportRow } from '@/api/types/performance-policy';

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

  it('uses countableCallCount for target overlay instead of logged volume', () => {
    const row = baseRow();
    const next = applyEngagementToRow(
      row,
      { callCount: 60, countableCallCount: 12, leadCount: 0, visitCount: 0 },
      '2026-08-07',
      '2026-08-07'
    );
    expect(next.calls.current).toBe(12);
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
    expect(row.hours.target).toBe(180);
    expect(row.hours.current).toBe(40);
  });

  it('uses 180 hours when the stored target is 0 or missing, and caps above 180', () => {
    const person = {
      uid: 42,
      name: 'Tian',
      surname: 'Geyer',
      email: 'tian@example.com',
    };

    const missing = rowFromUserListItem({
      ...person,
      userTarget: { currentHoursWorked: 204 },
    } as UserListItem);
    expect(missing.hours).toEqual({ current: 204, target: 180, progress: 100 });

    const zero = rowFromUserListItem({
      ...person,
      userTarget: { targetHoursWorked: 0, currentHoursWorked: 204 },
    } as UserListItem);
    expect(zero.hours).toEqual({ current: 204, target: 180, progress: 100 });

    const capped = rowFromUserListItem({
      ...person,
      userTarget: { targetHoursWorked: 200, currentHoursWorked: 10 },
    } as UserListItem);
    expect(capped.hours.target).toBe(180);
    expect(capped.hours.progress).toBe(6);

    const partTime = rowFromUserListItem({
      ...person,
      userTarget: { targetHoursWorked: 160, currentHoursWorked: 40 },
    } as UserListItem);
    expect(partTime.hours).toEqual({ current: 40, target: 160, progress: 25 });
  });

  it('prorates a missing hours target from 180, not from 0', () => {
    const row = rowFromUserListItem({
      uid: 42,
      name: 'Tian',
      surname: 'Geyer',
      email: 'tian@example.com',
      userTarget: {
        targetHoursWorked: 0,
        currentHoursWorked: 0,
        periodStartDate: '2026-08-01',
        periodEndDate: '2026-08-31',
      },
    } as UserListItem);
    const next = overlayTargetRowFilters(row, {
      rangeParams: { from: '2026-08-07', to: '2026-08-07' },
      hoursWorked: 8,
      hoursOverlayReady: true,
    });
    expect(next.hours.target).toBe(9);
    expect(next.hours.current).toBe(8);
    expect(next.hours.progress).toBe(89);
  });
});

describe('hours target on personal dashboard rows', () => {
  it('caps and fills hours the same way as the user list', () => {
    const row = rowFromPersonalTarget({
      userId: 1,
      ref: 'u1',
      name: 'Test User',
      email: 'test@example.com',
      dashboard: {
        personalTargets: {
          hours: { current: 204, target: 200, progress: 100 },
        },
      },
    });
    expect(row?.hours).toEqual({ current: 204, target: 180, progress: 100 });

    const enriched = enrichRowWithTargetDashboard(baseRow({ hours: { current: 0, target: 0, progress: 0 } }), {
      personalTargets: {
        hours: { current: 204, target: 0, progress: 0 },
      },
    });
    expect(enriched.hours).toEqual({ current: 204, target: 180, progress: 100 });
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

  it('keeps sales target, hours, and period dates when preserveRangeMetrics is true', () => {
    const row = baseRow({
      sales: { current: 10, target: 400, progress: 3, currency: 'ZAR' },
      hours: { current: 4, target: 9, progress: 44 },
      periodLabel: '1–7 Aug',
      periodStartDate: '2026-08-01',
      periodEndDate: '2026-08-07',
    });
    const next = enrichRowWithTargetDashboard(
      row,
      {
        personalTargets: {
          sales: { current: 999, target: 500000, progress: 0, currency: 'ZAR' },
          hours: { current: 160, target: 180, progress: 89 },
          periodStartDate: '2026-08-01',
          periodEndDate: '2026-08-31',
        },
      },
      { preserveRangeMetrics: true }
    );
    expect(next.sales.target).toBe(400);
    expect(next.sales.current).toBe(10);
    expect(next.hours.target).toBe(9);
    expect(next.hours.current).toBe(4);
    expect(next.periodStartDate).toBe('2026-08-01');
    expect(next.periodEndDate).toBe('2026-08-07');
    expect(next.periodLabel).toBe('1–7 Aug');
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

describe('applyErpSalesToRow', () => {
  it('keeps a negative turnover and does not change the sales target', () => {
    const row = baseRow({ sales: { current: 0, target: 400, progress: 0, currency: 'ZAR' } });
    const next = applyErpSalesToRow(row, -1250);
    expect(next.sales.current).toBe(-1250);
    expect(next.sales.target).toBe(400);
  });
});

describe('sumUniqueErpSales', () => {
  it('counts a shared rep code once and still adds rows with no code', () => {
    const shared = baseRow({
      userId: 1,
      sales: { current: 500, target: 1000, progress: 50, currency: 'ZAR' },
      erpSalesRepCode: 'ab',
      erpSalesCountryCode: 'SA',
    });
    const duplicate = baseRow({
      userId: 2,
      key: 'u2',
      ref: 'u2',
      sales: { current: 500, target: 800, progress: 63, currency: 'ZAR' },
      erpSalesRepCode: 'AB',
      erpSalesCountryCode: 'sa',
    });
    const other = baseRow({
      userId: 3,
      key: 'u3',
      ref: 'u3',
      sales: { current: 80, target: 100, progress: 80, currency: 'ZAR' },
    });
    expect(sumUniqueErpSales([shared, duplicate, other])).toBe(580);
  });
});

describe('call day rates', () => {
  const rates = { monThu: 60, friday: 40, saturday: 30 };

  it('shows 60 on a Monday, 40 on Friday, 30 on Saturday, and 0 on Sunday', () => {
    const period = {
      periodTarget: 1370,
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-10-31',
      callDayRates: rates,
      expectedDaysOverride: 1,
    };
    expect(prorateTargetForRange({ ...period, rangeFromYmd: '2026-10-12', rangeToYmd: '2026-10-12' })).toBe(60);
    expect(prorateTargetForRange({ ...period, rangeFromYmd: '2026-10-16', rangeToYmd: '2026-10-16' })).toBe(40);
    expect(prorateTargetForRange({ ...period, rangeFromYmd: '2026-10-17', rangeToYmd: '2026-10-17' })).toBe(30);
    expect(prorateTargetForRange({ ...period, rangeFromYmd: '2026-10-18', rangeToYmd: '2026-10-18' })).toBe(0);
  });

  it('sums a Mon–Sun week to 310 instead of the monthly total divided by 20', () => {
    expect(
      prorateTargetForRange({
        periodTarget: 1370,
        periodStartDate: '2026-10-01',
        periodEndDate: '2026-10-31',
        rangeFromYmd: '2026-10-12',
        rangeToYmd: '2026-10-18',
        expectedDaysOverride: 6,
        callDayRates: rates,
      })
    ).toBe(310);
  });
});

describe('policy expected days', () => {
  it('prorates from server expected days instead of the Mon-Fri count', () => {
    // 1200 / 20 = 60 per day; 18 expected days -> 1080 regardless of the calendar span.
    expect(
      prorateTargetForRange({
        periodTarget: 1200,
        periodStartDate: '2026-03-01',
        periodEndDate: '2026-03-31',
        rangeFromYmd: '2026-03-01',
        rangeToYmd: '2026-03-31',
        expectedDaysOverride: 18,
      })
    ).toBe(1080);
  });

  it('gives a zero target when the policy says no days are expected (leave all month)', () => {
    expect(
      prorateTargetForRange({
        periodTarget: 1200,
        rangeFromYmd: '2026-03-01',
        rangeToYmd: '2026-03-31',
        expectedDaysOverride: 0,
      })
    ).toBe(0);
  });

  it('applies the policy cell before engagement so calls use its expected days', () => {
    const policyByRef = new Map<string, PolicyReportRow>([
      [
        'u1',
        {
          status: 'below_standard',
          expectedDays: 10,
          activityPct: 0.5,
          flaggedVisits: 2,
          failedStandards: ['visits'],
        } as PolicyReportRow,
      ],
    ]);
    const next = overlayTargetRowFilters(baseRow({ periodStartDate: '2026-03-01', periodEndDate: '2026-03-31' }), {
      rangeParams: { from: '2026-03-01', to: '2026-03-31' },
      engagement: { callCount: 4, visitCount: 0, leadCount: 0, quotationCount: 0, quotationAmount: 0 },
      engagementReady: true,
      policy: policyCellForRef(policyByRef, 'u1'),
    });
    expect(next.calls.target).toBe(600);
    expect(next.policy?.flaggedVisits).toBe(2);
  });

  it('drops the policy in all-time mode and when the user has no policy row', () => {
    const stale = baseRow({
      policy: { status: 'meets_all', expectedDays: 20, activityPct: 1, flaggedVisits: 0, failedStandards: [] },
    });
    expect(overlayTargetRowFilters(stale, { rangeParams: null }).policy).toBeNull();
    expect(policyCellForRef(new Map(), 'u1')).toBeNull();
  });
});
