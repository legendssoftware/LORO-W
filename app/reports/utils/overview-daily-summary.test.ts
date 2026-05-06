import { describe, expect, it } from 'vitest';
import {
  utcCalendarDateFromLocalPickerDate,
  utcRangeIsoFromUtcCalendarStoredRange,
} from './overview-daily-summary';

describe('utcRangeIsoFromUtcCalendarStoredRange', () => {
  it('single UTC calendar day matches Overview check-ins bounds', () => {
    const d = new Date(Date.UTC(2026, 4, 6));
    expect(utcRangeIsoFromUtcCalendarStoredRange(d, d)).toEqual({
      startDate: '2026-05-06T00:00:00.000Z',
      endDate: '2026-05-06T23:59:59.999Z',
    });
  });

  it('spans inclusive UTC days for a range', () => {
    const a = new Date(Date.UTC(2026, 4, 5));
    const b = new Date(Date.UTC(2026, 4, 6));
    const r = utcRangeIsoFromUtcCalendarStoredRange(a, b);
    expect(r.startDate).toBe('2026-05-05T00:00:00.000Z');
    expect(r.endDate).toBe('2026-05-06T23:59:59.999Z');
  });
});

describe('utcCalendarDateFromLocalPickerDate', () => {
  it('maps local-picker wall date to UTC midnight of same Y/M/D', () => {
    const picked = new Date(2026, 4, 6, 15, 30, 0);
    const u = utcCalendarDateFromLocalPickerDate(picked);
    expect(u.toISOString().slice(0, 10)).toBe('2026-05-06');
  });
});
