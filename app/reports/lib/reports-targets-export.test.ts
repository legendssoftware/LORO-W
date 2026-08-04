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
    calls: { current: 85, target: 500, progress: 17 },
    leads: { current: 6, target: 50, progress: 12 },
    sales: { current: 10327, target: 500000, progress: 2, currency: 'ZAR' },
    hours: { current: 4, target: 8, progress: 50 },
    productivity: { score: 72 },
    achievement: 45,
    engagementMet: false,
    targetWarnings: null,
    ...overrides,
  };
}

describe('buildReportsTargetsExportHeaders', () => {
  it('excludes Email and Sales currency columns', () => {
    const headers = buildReportsTargetsExportHeaders('set');
    expect(headers).not.toContain('Email');
    expect(headers).not.toContain('Sales currency');
    expect(headers).toHaveLength(22);
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
    expect(row).toHaveLength(22);
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

  it('shows 100% for calls/leads when engagement met', () => {
    const row = reportsTargetRowToExportRow(
      minimalRow({ engagementMet: true, calls: { current: 85, target: 500, progress: 17 } }),
      'set'
    );
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('Calls %')]).toBe('100%');
    expect(row[headers.indexOf('Leads %')]).toBe('100%');
  });

  it('includes percent suffix on metric progress columns', () => {
    const row = reportsTargetRowToExportRow(minimalRow(), 'set');
    const headers = buildReportsTargetsExportHeaders('set');
    expect(row[headers.indexOf('Calls %')]).toBe('17%');
    expect(row[headers.indexOf('Sales %')]).toBe('2%');
    expect(row[headers.indexOf('Achievement %')]).toBe('45%');
  });
});
