import { describe, expect, it } from 'vitest';
import {
  EXPECTED_MONTHLY_HOURS,
  getPayrollProgressPercent,
} from '@/app/staff/lib/staff-report-constants';

describe('getPayrollProgressPercent', () => {
  it('uses the 180h period total so on-pace hours are not 100% mid-period', () => {
    expect(getPayrollProgressPercent(152, EXPECTED_MONTHLY_HOURS)).toBe(84);
    expect(getPayrollProgressPercent(125, EXPECTED_MONTHLY_HOURS)).toBe(69);
    expect(getPayrollProgressPercent(104, EXPECTED_MONTHLY_HOURS)).toBe(58);
  });

  it('reaches 100% only at or above the period total', () => {
    expect(getPayrollProgressPercent(180, EXPECTED_MONTHLY_HOURS)).toBe(100);
    expect(getPayrollProgressPercent(200, EXPECTED_MONTHLY_HOURS)).toBe(100);
  });

  it('returns 0 when there are no hours or no target', () => {
    expect(getPayrollProgressPercent(0, EXPECTED_MONTHLY_HOURS)).toBe(0);
    expect(getPayrollProgressPercent(80, 0)).toBe(0);
  });
});
