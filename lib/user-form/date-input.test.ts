import { describe, expect, it } from 'vitest';
import {
  ageFromIsoDate,
  formatIsoToDisplay,
  maskDisplayDate,
  parseFlexibleDate,
  toIsoDateString,
} from './date-input';

describe('parseFlexibleDate', () => {
  it('parses DD/MM/YYYY', () => {
    const parsed = parseFlexibleDate('15/01/1990');
    expect(parsed).toBeDefined();
    expect(toIsoDateString(parsed!)).toBe('1990-01-15');
  });

  it('parses D/M/YYYY and ISO', () => {
    expect(toIsoDateString(parseFlexibleDate('5/3/1998')!)).toBe('1998-03-05');
    expect(toIsoDateString(parseFlexibleDate('1998-03-05')!)).toBe('1998-03-05');
  });

  it('rejects impossible calendar dates', () => {
    expect(parseFlexibleDate('31/02/1998')).toBeUndefined();
    expect(parseFlexibleDate('1998-13-01')).toBeUndefined();
    expect(parseFlexibleDate('12/05/19')).toBeUndefined();
  });
});

describe('maskDisplayDate', () => {
  it('inserts slashes as digits are typed', () => {
    expect(maskDisplayDate('12051998')).toBe('12/05/1998');
    expect(maskDisplayDate('12')).toBe('12');
    expect(maskDisplayDate('1998-05-12')).toBe('1998-05-12');
  });
});

describe('formatIsoToDisplay', () => {
  it('formats ISO as DD/MM/YYYY', () => {
    expect(formatIsoToDisplay('1998-05-12')).toBe('12/05/1998');
  });
});

describe('ageFromIsoDate', () => {
  it('returns a positive age for 1990-01-15', () => {
    const age = ageFromIsoDate('1990-01-15');
    expect(age).toBeGreaterThanOrEqual(16);
    expect(age).toBeLessThanOrEqual(80);
  });
});
