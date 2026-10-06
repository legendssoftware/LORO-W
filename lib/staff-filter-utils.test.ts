import { describe, expect, it } from 'vitest';
import type { ReportCardUser } from '@/lib/types/staff-report-types';
import { staffHasNotClockedInMoreThan } from './staff-filter-utils';

function userWithClockIn(lastClockInAt: string | null): ReportCardUser {
  return {
    userId: 1,
    ref: '1',
    name: 'Test User',
    email: 'test@example.com',
    hoursThisMonth: 0,
    progressPercent: 0,
    isPresent: false,
    lastClockInAt,
  };
}

const today = new Date(2026, 9, 6, 12, 0, 0);

function isoDaysBefore(days: number): string {
  return new Date(2026, 9, 6 - days, 8, 0, 0).toISOString();
}

describe('staffHasNotClockedInMoreThan', () => {
  it('includes staff who have never clocked in', () => {
    expect(staffHasNotClockedInMoreThan(userWithClockIn(null), 2, today)).toBe(true);
  });

  it('excludes staff who clocked in today', () => {
    expect(staffHasNotClockedInMoreThan(userWithClockIn(isoDaysBefore(0)), 2, today)).toBe(
      false
    );
  });

  it('matches longer gaps for every shorter threshold', () => {
    const user = userWithClockIn(isoDaysBefore(16));
    expect(staffHasNotClockedInMoreThan(user, 2, today)).toBe(true);
    expect(staffHasNotClockedInMoreThan(user, 7, today)).toBe(true);
    expect(staffHasNotClockedInMoreThan(user, 10, today)).toBe(true);
  });

  it('keeps a 5-day gap out of the 7-day option', () => {
    const user = userWithClockIn(isoDaysBefore(5));
    expect(staffHasNotClockedInMoreThan(user, 2, today)).toBe(true);
    expect(staffHasNotClockedInMoreThan(user, 7, today)).toBe(false);
  });
});
