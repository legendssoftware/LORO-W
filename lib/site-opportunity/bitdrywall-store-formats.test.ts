import { describe, expect, it } from 'vitest';
import {
  formatStoreFormatSizeRange,
  formatStoreFormatSummary,
  formatStoreFormatTurnoverRange,
  isStoreSizeSuggestionEnabled,
  suggestBitDrywallStoreFormat,
} from './bitdrywall-store-formats';

describe('suggestBitDrywallStoreFormat', () => {
  it('suggests Express at the smallest office size below the Express band', () => {
    const suggestion = suggestBitDrywallStoreFormat(0);
    expect(suggestion.formatKey).toBe('express');
    expect(suggestion.suggestedSizeSqm).toBe(100);
    expect(suggestion.belowRange).toBe(true);
    expect(suggestion.aboveRange).toBe(false);
  });

  it('starts Express at R500k with 100 m²', () => {
    const suggestion = suggestBitDrywallStoreFormat(500_000);
    expect(suggestion.formatKey).toBe('express');
    expect(suggestion.suggestedSizeSqm).toBe(100);
    expect(suggestion.belowRange).toBe(false);
  });

  it('steps up to Mini at Mini’s lower bound (overlap with Express)', () => {
    const justBelow = suggestBitDrywallStoreFormat(799_999);
    expect(justBelow.formatKey).toBe('express');
    expect(justBelow.suggestedSizeSqm).toBe(150);

    const atBound = suggestBitDrywallStoreFormat(800_000);
    expect(atBound.formatKey).toBe('mini');
    expect(atBound.suggestedSizeSqm).toBe(150);
  });

  it('steps up to Standard at R1.2m (overlap with Mini)', () => {
    expect(suggestBitDrywallStoreFormat(1_199_999).formatKey).toBe('mini');
    const suggestion = suggestBitDrywallStoreFormat(1_200_000);
    expect(suggestion.formatKey).toBe('standard');
    expect(suggestion.suggestedSizeSqm).toBe(300);
  });

  it('steps up to Pro at R2.0m and Hub at R3.0m', () => {
    expect(suggestBitDrywallStoreFormat(1_999_999).formatKey).toBe('standard');
    expect(suggestBitDrywallStoreFormat(2_000_000).formatKey).toBe('pro');
    expect(suggestBitDrywallStoreFormat(2_000_000).suggestedSizeSqm).toBe(500);
    expect(suggestBitDrywallStoreFormat(2_999_999).formatKey).toBe('pro');
    expect(suggestBitDrywallStoreFormat(3_000_000).formatKey).toBe('hub');
    expect(suggestBitDrywallStoreFormat(3_000_000).suggestedSizeSqm).toBe(800);
  });

  it('interpolates office size inside the exclusive Mini band', () => {
    const suggestion = suggestBitDrywallStoreFormat(1_000_000);
    expect(suggestion.formatKey).toBe('mini');
    expect(suggestion.suggestedSizeSqm).toBe(200);
  });

  it('caps Hub at 1,500 m² above R6m', () => {
    const atCap = suggestBitDrywallStoreFormat(6_000_000);
    expect(atCap.formatKey).toBe('hub');
    expect(atCap.suggestedSizeSqm).toBe(1_500);
    expect(atCap.aboveRange).toBe(false);

    const above = suggestBitDrywallStoreFormat(10_000_000);
    expect(above.formatKey).toBe('hub');
    expect(above.suggestedSizeSqm).toBe(1_500);
    expect(above.aboveRange).toBe(true);
  });

  it('treats non-finite turnover as below range Express', () => {
    const suggestion = suggestBitDrywallStoreFormat(Number.NaN);
    expect(suggestion.formatKey).toBe('express');
    expect(suggestion.suggestedSizeSqm).toBe(100);
    expect(suggestion.belowRange).toBe(true);
  });
});

describe('store format display helpers', () => {
  it('formats size, turnover, and summary labels', () => {
    const suggestion = suggestBitDrywallStoreFormat(1_600_000);
    expect(formatStoreFormatSizeRange(suggestion)).toBe('300–400 m²');
    expect(formatStoreFormatTurnoverRange(suggestion)).toBe('R 1.2m–R 2.0m');
    expect(formatStoreFormatSummary(suggestion)).toBe('Standard · 350 m²');
  });

  it('marks Hub turnover as open-ended', () => {
    const suggestion = suggestBitDrywallStoreFormat(4_000_000);
    expect(formatStoreFormatTurnoverRange(suggestion)).toBe('R 3.0m–R 6.0m+');
  });

  it('treats a missing toggle as enabled', () => {
    expect(isStoreSizeSuggestionEnabled(undefined)).toBe(true);
    expect(isStoreSizeSuggestionEnabled(true)).toBe(true);
    expect(isStoreSizeSuggestionEnabled(false)).toBe(false);
  });
});
