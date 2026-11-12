import { describe, expect, it } from 'vitest';
import type { ReportsTargetRow } from '@/app/reports/lib/reports-target-row';
import {
  buildReportsTargetsExportHeaders,
  formatExportCount,
  formatExportMoney,
  formatExportPercent,
  reportsTargetRowToExportRow,
} from '@/app/reports/lib/reports-targets-export';

function minimalRow(overrides: Partial<ReportsTargetRow> = {}): ReportsTargetRow {
  return {
    key: '1',
    userId: 1,
    ref: 'user-1',
    name: 'Anathi Malikiti',
    email: 'anathi@gmail.com',
    branch: 'BitGeorge',
    periodLabel: 'Aug 4, 2026 - Aug 4, 2026',
    activity: { all: 110, telephone: 70, whatsapp: 8, email: 4, landline: 3, other: 1 },
    calls: { current: 85, target: 500, progress: 17 },
    visits: { current: 12, target: 160, progress: 8 },
    leads: { current: 6, target: 50, progress: 12 },
    quotations: { current: 2, target: 50000, amountCurrent: 5000, progress: 10, currency: 'ZAR' },
    sales: { current: 10327, target: 500000, progress: 2, currency: 'ZAR' },
    hours: { current: 4, target: 8, progress: 50 },
    travel: {
      distanceKm: 48.2,
      visitCount: 12,
      petrolClaimCount: 2,
      petrolClaimAmount: 1240,
      fuelAllowance: 2000,
      progress: 62,
      fuelSpentZar: 800,
      fuelPriced: true,
      fuelUsedPercent: 40,
    },
    productivity: { score: 72 },
    achievement: 45,
    engagementMet: false,
    targetWarnings: null,
    ...overrides,
  };
}

describe('buildReportsTargetsExportHeaders', () => {
  it('keeps the Email activity column and omits a sales currency column', () => {
    const headers = buildReportsTargetsExportHeaders('set');
    expect(headers).toContain('Email');
    expect(headers).not.toContain('Sales currency');
    expect(headers).toContain('Distance (km)');
    expect(headers).toContain('All Activity (current)');
    expect(headers).toContain('All Activity (target)');
    expect(headers).toContain('All Activity %');
    expect(headers).toContain('Telephone');
    expect(headers).toContain('WhatsApp');
    expect(headers).toContain('Email');
    expect(headers).toContain('Landline');
    expect(headers).toContain('Other');
    expect(headers).not.toContain('Call target');
    expect(headers).toContain('Visits (travel)');
    expect(headers).not.toContain('Policy status');
    expect(headers).not.toContain('Warnings acknowledged');
    expect(headers).toContain('Petrol claims (amount)');
    expect(headers).toContain('Fuel on pace');
    expect(headers).toContain('Fuel upfront');
    expect(headers).toHaveLength(40);
  });

  it('includes R in sales headers for ZAR consolidated view', () => {
    const headers = buildReportsTargetsExportHeaders('zar');
    expect(headers).toContain('Sales (current) R');
    expect(headers).toContain('Sales (target) R');
  });

  it('labels sales headers for set and branch views', () => {
    expect(buildReportsTargetsExportHeaders('set')).toContain('Sales (current, set)');
    expect(buildReportsTargetsExportHeaders('branch')).toContain('Sales (current, branch)');
  });
});

describe('formatExportCount / formatExportPercent / formatExportMoney', () => {
  it('formats counts with thousands separators', () => {
    expect(formatExportCount(495982)).toMatch(/495[,.\s]?982/);
  });

  it('formats percentages with % suffix', () => {
    expect(formatExportPercent(50)).toBe('50%');
    expect(formatExportPercent(100)).toBe('100%');
  });

  it('formats money with currency prefix', () => {
    expect(formatExportMoney(10327, 'ZAR')).toMatch(/^R 10[,.\s]?327$/);
    expect(formatExportMoney(495982, 'BWP')).toMatch(/^BWP 495[,.\s]?982$/);
  });

  it('omits currency prefix when requested (ZAR consolidated)', () => {
    expect(formatExportMoney(10327, 'ZAR', false)).toMatch(/^10[,.\s]?327$/);
  });
});

describe('reportsTargetRowToExportRow', () => {
  it('does not include email in export row', () => {
    const row = reportsTargetRowToExportRow(minimalRow(), 'set');
    expect(row).not.toContain('anathi@gmail.com');
    expect(row[0]).toBe('Anathi Malikiti');
    expect(row).toHaveLength(40);
  });

  it('formats sales with currency prefix in set view', () => {
    const row = reportsTargetRowToExportRow(minimalRow(), 'set');
    const salesCurrentIdx = buildReportsTargetsExportHeaders('set').indexOf('Sales (current, set)');
    expect(row[salesCurrentIdx]).toMatch(/^R 10[,.\s]?327$/);
  });

  it('formats sales without currency prefix in zar view', () => {
    const row = reportsTargetRowToExportRow(minimalRow(), 'zar');
    const salesCurrentIdx = buildReportsTargetsExportHeaders('zar').indexOf('Sales (current) R');
    expect(row[salesCurrentIdx]).toMatch(/^10[,.\s]?327$/);
  });

  it('exports each column percent from its own progress when engagement is met', () => {
    const row = reportsTargetRowToExportRow(
      minimalRow({
        engagementMet: true,
        calls: { current: 39, target: 60, progress: 65 },
        leads: { current: 29, target: 60, progress: 48 },
      }),
      'set'
    );
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('All Activity %')]).toBe('100%');
    expect(row[headers.indexOf('All Activity (current)')]).toBe(formatExportCount(110));
    expect(row[headers.indexOf('Other')]).toBe(formatExportCount(1));
    expect(row[headers.indexOf('Leads %')]).toBe('48%');
  });

  it('includes percent suffix on metric progress columns', () => {
    const row = reportsTargetRowToExportRow(minimalRow(), 'set');
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('All Activity %')]).toBe('22%');
    expect(row[headers.indexOf('All Activity (current)')]).toBe(formatExportCount(110));
    expect(row[headers.indexOf('Telephone')]).toBe(formatExportCount(70));
    expect(row[headers.indexOf('Sales %')]).toBe('2%');
    expect(row[headers.indexOf('Achievement %')]).toBe('45%');
  });

  it('exports the travel visit count in its own column', () => {
    const row = reportsTargetRowToExportRow(
      minimalRow({
        visits: { current: 12, target: 160, progress: 8 },
        travel: {
          distanceKm: 48.2,
          visitCount: 88,
          petrolClaimCount: 2,
          petrolClaimAmount: 1240,
          fuelAllowance: 2000,
          progress: 62,
          fuelSpentZar: 800,
          fuelPriced: true,
          fuelUsedPercent: 40,
        },
      }),
      'set'
    );
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('Visits (current)')]).toBe(formatExportCount(12));
    expect(row[headers.indexOf('Visits (travel)')]).toBe(formatExportCount(88));
    expect(row[headers.indexOf('Fuel spent')]).toBe(formatExportMoney(800, 'ZAR', true));
    expect(row[headers.indexOf('Fuel used %')]).toBe('40%');
    expect(row[headers.indexOf('Fuel on pace')]).toBe('');
    expect(row[headers.indexOf('Fuel upfront')]).toBe('');
  });

  it('exports the period forecast separately from the filter spend', () => {
    const row = reportsTargetRowToExportRow(
      minimalRow({
        travel: {
          distanceKm: 48.2,
          visitCount: 12,
          petrolClaimCount: 2,
          petrolClaimAmount: 1240,
          fuelAllowance: 2000,
          progress: 62,
          fuelSpentZar: 800,
          fuelPriced: true,
          fuelUsedPercent: 40,
          fuelProjectedEndZar: 4040,
          fuelPayDecision: 'pay-projected',
          fuelUpfrontPayZar: 4040,
        },
      }),
      'set'
    );
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('Fuel used %')]).toBe('40%');
    expect(row[headers.indexOf('Fuel on pace')]).toBe(formatExportMoney(4040, 'ZAR', true));
    expect(row[headers.indexOf('Fuel upfront')]).toBe(formatExportMoney(4040, 'ZAR', true));
  });

  it('exports None for fuel when the person is not external sales', () => {
    const row = reportsTargetRowToExportRow(
      minimalRow({
        workforceType: 'internal_employee',
        travel: {
          distanceKm: 10,
          visitCount: 2,
          petrolClaimCount: 1,
          petrolClaimAmount: 400,
          fuelAllowance: 5000,
          progress: 8,
          fuelSpentZar: 100,
          fuelPriced: true,
          fuelUsedPercent: 2,
        },
      }),
      'set'
    );
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('Distance (km)')]).toBe('10');
    expect(row[headers.indexOf('Fuel allowance')]).toBe('None');
    expect(row[headers.indexOf('Fuel spent')]).toBe('None');
    expect(row[headers.indexOf('Fuel used %')]).toBe('None');
    expect(row[headers.indexOf('Fuel on pace')]).toBe('None');
    expect(row[headers.indexOf('Fuel upfront')]).toBe('None');
  });
});
