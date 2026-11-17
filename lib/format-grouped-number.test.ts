import { describe, expect, it } from 'vitest';
import {
  formatGroupedNumber,
  formatGroupedNumberInput,
  parseGroupedNumber,
} from '@/lib/format-grouped-number';

describe('formatGroupedNumber', () => {
  it('inserts commas while typing integers', () => {
    expect(formatGroupedNumberInput('2000000', false)).toBe('2,000,000');
    expect(formatGroupedNumberInput('4,666,667', false)).toBe('4,666,667');
    expect(formatGroupedNumber(4_666_667, false)).toBe('4,666,667');
  });

  it('keeps a trailing decimal for radius-style values', () => {
    expect(formatGroupedNumberInput('5.', true)).toBe('5.');
    expect(formatGroupedNumberInput('12.5', true)).toBe('12.5');
    expect(parseGroupedNumber('12.5')).toBe(12.5);
  });

  it('parses grouped values and ignores empty text', () => {
    expect(parseGroupedNumber('1,500')).toBe(1500);
    expect(parseGroupedNumber('')).toBeNull();
    expect(parseGroupedNumber('.')).toBeNull();
  });
});
