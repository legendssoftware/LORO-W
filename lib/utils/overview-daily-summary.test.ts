import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  countCallsByOwnerUid,
  getThresholdReferenceUtcDay,
  resolveTargetsUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcRangeIsoFromUtcCalendarStoredRange,
} from './overview-daily-summary';
import type { VisitListItem } from '@/api/types/visits';

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

describe('getThresholdReferenceUtcDay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses range end when the range ends on or before today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));

    const start = new Date(Date.UTC(2026, 6, 1));
    const end = new Date(Date.UTC(2026, 6, 20));
    expect(getThresholdReferenceUtcDay(start, end).toISOString().slice(0, 10)).toBe(
      '2026-07-20'
    );
  });

  it('uses today when range end is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));

    const start = new Date(Date.UTC(2026, 6, 1));
    const end = new Date(Date.UTC(2026, 6, 31));
    expect(getThresholdReferenceUtcDay(start, end).toISOString().slice(0, 10)).toBe(
      '2026-07-24'
    );
  });

  it('uses the single selected day for a one-day range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00.000Z'));

    const day = new Date(Date.UTC(2026, 6, 10));
    expect(getThresholdReferenceUtcDay(day, day).toISOString().slice(0, 10)).toBe(
      '2026-07-10'
    );
  });
});

describe('resolveTargetsUtcCalendarRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns from/to ymd for a historical multi-day range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));

    const start = new Date(Date.UTC(2026, 3, 1));
    const end = new Date(Date.UTC(2026, 4, 31));
    const r = resolveTargetsUtcCalendarRange(start, end);
    expect(r.fromYmd).toBe('2026-04-01');
    expect(r.toYmd).toBe('2026-05-31');
    expect(r.referenceDayYmd).toBe('2026-05-31');
    expect(r.isSingleDay).toBe(false);
  });

  it('caps range end at today for API queries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));

    const start = new Date(Date.UTC(2026, 6, 1));
    const end = new Date(Date.UTC(2026, 11, 31));
    const r = resolveTargetsUtcCalendarRange(start, end);
    expect(r.fromYmd).toBe('2026-07-01');
    expect(r.toYmd).toBe('2026-07-25');
    expect(r.referenceDayYmd).toBe('2026-07-25');
  });
});

describe('countCallsByOwnerUid', () => {
  it('counts only non-physical check-ins per owner', () => {
    const checkIns = [
      { owner: { uid: 1 }, methodOfContact: 'PHONE' },
      { owner: { uid: 1 }, methodOfContact: 'PHYSICAL' },
      { owner: { uid: 2 }, methodOfContact: 'EMAIL' },
    ] as VisitListItem[];

    const counts = countCallsByOwnerUid(checkIns);
    expect(counts.get(1)).toBe(1);
    expect(counts.get(2)).toBe(1);
  });
});
