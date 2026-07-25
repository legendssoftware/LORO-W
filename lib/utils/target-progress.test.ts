import { describe, expect, it } from 'vitest';
import {
  calcCallsLeadsEngagementProgress,
  calcOverallAchievement,
  calcOverallAchievementWithEngagement,
  calcTargetProgress,
  isCallsLeadsEngagementMet,
  resolveCallsLeadsCellProgress,
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

describe('isCallsLeadsEngagementMet', () => {
  const both = { targetCalls: 60, targetLeads: 60 };

  it('passes with 30+30 mix', () => {
    expect(
      isCallsLeadsEngagementMet({
        actualCalls: 30,
        actualLeads: 30,
        ...both,
      })
    ).toBe(true);
  });

  it('passes with full calls only', () => {
    expect(
      isCallsLeadsEngagementMet({
        actualCalls: 60,
        actualLeads: 0,
        ...both,
      })
    ).toBe(true);
  });

  it('passes with full leads only', () => {
    expect(
      isCallsLeadsEngagementMet({
        actualCalls: 0,
        actualLeads: 60,
        ...both,
      })
    ).toBe(true);
  });

  it('misses with 30+29', () => {
    expect(
      isCallsLeadsEngagementMet({
        actualCalls: 30,
        actualLeads: 29,
        ...both,
      })
    ).toBe(false);
  });

  it('uses calls-only when leads target is 0', () => {
    expect(
      isCallsLeadsEngagementMet({
        actualCalls: 60,
        actualLeads: 0,
        targetCalls: 60,
        targetLeads: 0,
      })
    ).toBe(true);
    expect(
      isCallsLeadsEngagementMet({
        actualCalls: 59,
        actualLeads: 100,
        targetCalls: 60,
        targetLeads: 0,
      })
    ).toBe(false);
  });
});

describe('calcCallsLeadsEngagementProgress', () => {
  it('returns 100 for 30+30 against 60/60', () => {
    expect(
      calcCallsLeadsEngagementProgress({
        actualCalls: 30,
        actualLeads: 30,
        targetCalls: 60,
        targetLeads: 60,
      })
    ).toBe(100);
  });

  it('returns combined progress when short', () => {
    expect(
      calcCallsLeadsEngagementProgress({
        actualCalls: 30,
        actualLeads: 29,
        targetCalls: 60,
        targetLeads: 60,
      })
    ).toBe(98);
  });
});

describe('resolveCallsLeadsCellProgress', () => {
  it('marks both cells 100 when engagement met via mix', () => {
    const r = resolveCallsLeadsCellProgress({
      actualCalls: 30,
      actualLeads: 30,
      targetCalls: 60,
      targetLeads: 60,
    });
    expect(r.engagementMet).toBe(true);
    expect(r.callsProgress).toBe(100);
    expect(r.leadsProgress).toBe(100);
    expect(r.engagementProgress).toBe(100);
  });

  it('keeps raw column progress when not met', () => {
    const r = resolveCallsLeadsCellProgress({
      actualCalls: 30,
      actualLeads: 0,
      targetCalls: 60,
      targetLeads: 60,
    });
    expect(r.engagementMet).toBe(false);
    expect(r.callsProgress).toBe(50);
    expect(r.leadsProgress).toBe(0);
    expect(r.engagementProgress).toBe(50);
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

describe('calcOverallAchievementWithEngagement', () => {
  it('counts calls+leads as one dimension when both targets set', () => {
    // 30+30 = engagement 100; sales 32%; hours 0% → avg (100+32+0)/3 ≈ 44
    expect(
      calcOverallAchievementWithEngagement({
        calls: { current: 30, target: 60 },
        leads: { current: 30, target: 60 },
        sales: { current: 144848, target: 450000 },
        hours: { current: 0, target: 9 },
      })
    ).toBe(44);
  });

  it('does not double-count two 50% columns when mix is done', () => {
    // Old formula would average 50+50+0+0 = 25; new is engagement 100 + 0 + 0 = 33
    expect(
      calcOverallAchievementWithEngagement({
        calls: { current: 30, target: 60 },
        leads: { current: 30, target: 60 },
        sales: { current: 0, target: 100 },
        hours: { current: 0, target: 100 },
      })
    ).toBe(33);
  });
});
