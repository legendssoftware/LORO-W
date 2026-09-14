import { describe, expect, it } from 'vitest';
import {
  HOURLY_SALES_X_TICKS,
  padHourlySalesDomain,
} from './hourly-sales-chart';

describe('padHourlySalesDomain', () => {
  it('returns empty when there is no data', () => {
    expect(padHourlySalesDomain([])).toEqual([]);
  });

  it('pads 07:00–17:00 and nulls hours after the last known point', () => {
    const padded = padHourlySalesDomain([
      { label: '7am', value: 13000 },
      { label: '8am', value: 21000 },
    ]);

    expect(padded).toHaveLength(11);
    expect(padded[0]).toEqual({ name: '7am', value: 13000 });
    expect(padded[1]).toEqual({ name: '8am', value: 21000 });
    expect(padded[2]).toEqual({ name: '9am', value: null });
    expect(padded[padded.length - 1]).toEqual({ name: '5pm', value: null });
  });

  it('fills missing hours before the last known point with 0', () => {
    const padded = padHourlySalesDomain([
      { label: '7am', value: 100 },
      { label: '11am', value: 400 },
    ]);

    expect(padded.find((p) => p.name === '8am')).toEqual({ name: '8am', value: 0 });
    expect(padded.find((p) => p.name === '11am')).toEqual({ name: '11am', value: 400 });
    expect(padded.find((p) => p.name === '12pm')).toEqual({ name: '12pm', value: null });
  });
});

describe('HOURLY_SALES_X_TICKS', () => {
  it('is a 4-hour grid across the workday', () => {
    expect(HOURLY_SALES_X_TICKS).toEqual(['7am', '11am', '3pm', '5pm']);
  });
});
