import { describe, expect, it } from 'vitest';
import { prorateTargetForRange } from '@/app/reports/lib/reports-target-row';
import {
  TARGET_WORKING_DAYS_PER_MONTH,
  workingDaysInclusiveYmd,
} from '@/lib/utils/target-working-days';

describe('target working days + prorateTargetForRange', () => {
  it('uses 20-day month so 1200 → 60 on a single weekday', () => {
    expect(TARGET_WORKING_DAYS_PER_MONTH).toBe(20);
    expect(
      prorateTargetForRange({
        periodTarget: 1200,
        periodStartDate: '2026-03-01',
        periodEndDate: '2026-03-31',
        rangeFromYmd: '2026-03-02', // Monday
        rangeToYmd: '2026-03-02',
      }),
    ).toBe(60);
  });

  it('scales leads the same way (display 60 for each)', () => {
    expect(
      prorateTargetForRange({
        periodTarget: 1200,
        periodStartDate: '2026-03-01',
        periodEndDate: '2026-03-31',
        rangeFromYmd: '2026-03-02',
        rangeToYmd: '2026-03-02',
      }),
    ).toBe(60);
  });

  it('external 400/month → 20/day', () => {
    expect(
      prorateTargetForRange({
        periodTarget: 400,
        periodStartDate: '2026-03-01',
        periodEndDate: '2026-03-31',
        rangeFromYmd: '2026-03-02',
        rangeToYmd: '2026-03-02',
      }),
    ).toBe(20);
  });

  it('counts Mon–Fri only in a week', () => {
    expect(workingDaysInclusiveYmd('2026-03-02', '2026-03-08')).toBe(5);
  });
});
