import { describe, expect, it } from 'vitest';
import {
  calcOverallAchievement,
  calcTargetProgress,
  targetNum,
} from '@/lib/utils/target-progress';

describe('targetNum', () => {
  it('parses finite numbers', () => {
    expect(targetNum(10)).toBe(10);
    expect(targetNum('5')).toBe(5);
    expect(targetNum(null)).toBe(0);
    expect(targetNum(undefined)).toBe(0);
    expect(targetNum('x')).toBe(0);
  });
});

describe('calcTargetProgress', () => {
  it('matches server pct formula', () => {
    expect(calcTargetProgress(50, 100)).toBe(50);
    expect(calcTargetProgress(150, 100)).toBe(100);
    expect(calcTargetProgress(1, 0)).toBe(0);
    expect(calcTargetProgress(33, 100)).toBe(33);
  });
});

describe('calcOverallAchievement', () => {
  it('averages only metrics with positive targets', () => {
    expect(
      calcOverallAchievement([
        { current: 50, target: 100 },
        { current: 100, target: 100 },
        { current: 0, target: 0 },
      ])
    ).toBe(75);
  });

  it('prefers provided progress when present', () => {
    expect(
      calcOverallAchievement([
        { current: 0, target: 100, progress: 40 },
        { current: 0, target: 100, progress: 60 },
      ])
    ).toBe(50);
  });

  it('returns 0 when no active metrics', () => {
    expect(calcOverallAchievement([{ current: 5, target: 0 }])).toBe(0);
  });
});
