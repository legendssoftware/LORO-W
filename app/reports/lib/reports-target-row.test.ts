import { describe, expect, it } from 'vitest';
import {
  applyEngagementToRow,
  rowFromUserListItem,
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
