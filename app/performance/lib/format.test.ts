import { describe, expect, it } from 'vitest';
import {
  formatPerformanceMoney,
  formatPerformancePercent,
  performanceAmountClassName,
  performanceGpPercentClassName,
} from './format';

describe('formatPerformanceMoney', () => {
  it('wraps negatives as (-symbol amount)', () => {
    const formatted = formatPerformanceMoney(-13926.5, 'R').replace(/\s/g, ' ');
    expect(formatted).toBe('(-R13 926,50)');
  });
});

describe('formatPerformancePercent', () => {
  it('wraps negatives as (-x.x%)', () => {
    expect(formatPerformancePercent(-12.5)).toBe('(-12.5%)');
  });
});

describe('performanceAmountClassName', () => {
  it('is red for negatives and green otherwise', () => {
    expect(performanceAmountClassName(-1)).toContain('text-red-600');
    expect(performanceAmountClassName(0)).toContain('text-green-600');
    expect(performanceAmountClassName(10)).toContain('text-green-600');
  });
});

describe('performanceGpPercentClassName', () => {
  it('is red below 30% and green at or above', () => {
    expect(performanceGpPercentClassName(12)).toContain('text-red-600');
    expect(performanceGpPercentClassName(29.9)).toContain('text-red-600');
    expect(performanceGpPercentClassName(30)).toContain('text-green-600');
    expect(performanceGpPercentClassName(35)).toContain('text-green-600');
  });
});
