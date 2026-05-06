import { describe, expect, it } from 'vitest';
import type { VisitListItem } from '@/api/types/visits';
import {
  countCheckInsInProgressBucket,
  countCheckInsInUtcMsWindow,
  utcInclusiveRangeMsFromProgressBucketKey,
} from './targets-progress-bucket-utc';

describe('utcInclusiveRangeMsFromProgressBucketKey', () => {
  it('parses hourly bucket key (UTC hour)', () => {
    const r = utcInclusiveRangeMsFromProgressBucketKey('2026-05-06T05', 'day');
    expect(r).not.toBeNull();
    expect(r!.startMs).toBe(Date.UTC(2026, 4, 6, 5, 0, 0, 0));
    expect(r!.endMs).toBe(Date.UTC(2026, 4, 6, 5, 59, 59, 999));
  });

  it('parses daily bucket key (UTC day)', () => {
    const r = utcInclusiveRangeMsFromProgressBucketKey('2026-05-06', 'month');
    expect(r).not.toBeNull();
    expect(r!.startMs).toBe(Date.UTC(2026, 4, 6, 0, 0, 0, 0));
    expect(r!.endMs).toBe(Date.UTC(2026, 4, 6, 23, 59, 59, 999));
  });

  it('returns null for invalid hour key in hourly mode', () => {
    expect(utcInclusiveRangeMsFromProgressBucketKey('2026-05-06', 'day')).toBeNull();
    expect(utcInclusiveRangeMsFromProgressBucketKey('2026-05-06T24', 'day')).toBeNull();
    expect(utcInclusiveRangeMsFromProgressBucketKey('bad', 'day')).toBeNull();
  });

  it('returns null for invalid key in daily mode', () => {
    expect(utcInclusiveRangeMsFromProgressBucketKey('2026-05-06T05', 'month')).toBeNull();
    expect(utcInclusiveRangeMsFromProgressBucketKey('bad', 'month')).toBeNull();
  });
});

describe('countCheckInsInUtcMsWindow', () => {
  function row(timeIso: string): VisitListItem {
    return {
      checkInTime: timeIso,
    } as VisitListItem;
  }

  it('counts inclusive bounds', () => {
    const start = Date.UTC(2026, 4, 6, 5, 0, 0, 0);
    const end = Date.UTC(2026, 4, 6, 5, 59, 59, 999);
    const checkIns = [
      row('2026-05-06T05:00:00.000Z'),
      row('2026-05-06T05:30:00.000Z'),
      row('2026-05-06T05:59:59.999Z'),
      row('2026-05-06T04:59:59.999Z'),
      row('2026-05-06T06:00:00.000Z'),
    ];
    expect(countCheckInsInUtcMsWindow(checkIns, start, end)).toBe(3);
  });
});

describe('countCheckInsInProgressBucket', () => {
  function row(timeIso: string): VisitListItem {
    return {
      checkInTime: timeIso,
    } as VisitListItem;
  }

  it('uses key-based window for hour mode', () => {
    const checkIns = [row('2026-05-06T05:15:00.000Z'), row('2026-05-06T06:00:00.000Z')];
    expect(countCheckInsInProgressBucket(checkIns, '2026-05-06T05', 'day')).toBe(1);
  });

  it('uses key-based window for day mode', () => {
    const checkIns = [
      row('2026-05-06T00:30:00.000Z'),
      row('2026-05-06T23:00:00.000Z'),
      row('2026-05-07T00:00:00.000Z'),
    ];
    expect(countCheckInsInProgressBucket(checkIns, '2026-05-06', 'month')).toBe(2);
  });

  it('returns 0 when key does not parse', () => {
    expect(countCheckInsInProgressBucket([], 'nope', 'day')).toBe(0);
  });
});
