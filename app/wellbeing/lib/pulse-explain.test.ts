import { describe, expect, it } from 'vitest';
import type { PulseNamedPerson } from '@/api/types/pulse';
import { describePersonStatus, describeTrend } from './pulse-explain';

function person(overrides: Partial<PulseNamedPerson>): PulseNamedPerson {
  return {
    ownerUid: 1,
    name: 'Test Person',
    photoUrl: null,
    branchName: null,
    countryCode: null,
    morningMood: null,
    eveningMood: null,
    talkTo: 'none',
    followUpRequested: false,
    contributors: [],
    comments: null,
    contactFeedback: null,
    ...overrides,
  };
}

describe('describeTrend', () => {
  it('reports missing data as neutral instead of flat', () => {
    expect(describeTrend(8, null)).toMatchObject({ label: 'Awaiting evening check-in', tone: 'neutral' });
    expect(describeTrend(null, 8)).toMatchObject({ label: 'No morning check-in', tone: 'neutral' });
    expect(describeTrend(null, null)).toMatchObject({ label: 'No check-ins yet', tone: 'neutral' });
  });

  it('classifies changes at the band boundaries', () => {
    expect(describeTrend(6, 8)).toMatchObject({ label: 'Much better by evening', tone: 'good' });
    expect(describeTrend(6, 6.3)).toMatchObject({ label: 'Improving through the day', tone: 'good' });
    expect(describeTrend(6, 6.2)).toMatchObject({ label: 'Steady', tone: 'warn' });
    expect(describeTrend(6, 5.8)).toMatchObject({ label: 'Steady', tone: 'warn' });
    expect(describeTrend(6, 5.7)).toMatchObject({ label: 'Dipping through the day', tone: 'bad' });
    expect(describeTrend(8, 6)).toMatchObject({ label: 'Sharp drop', tone: 'bad' });
  });

  it('includes the numbers in the detail', () => {
    expect(describeTrend(8, 5.5).detail).toContain('-2.5');
  });
});

describe('describePersonStatus', () => {
  it('marks a day drop and declining streak red', () => {
    expect(describePersonStatus(person({ riskReason: 'day_drop', morningMood: 'good', eveningMood: 'not_feeling_well' })).tone).toBe('bad');
    expect(describePersonStatus(person({ riskReason: 'declining_streak' })).tone).toBe('bad');
  });

  it('treats a one-step mood dip as a dip, not a sharp drop', () => {
    expect(describePersonStatus(person({ morningMood: 'good', eveningMood: 'okay' }))).toMatchObject({
      label: 'Dipping through the day',
      tone: 'bad',
    });
  });

  it('marks an improved day green', () => {
    expect(describePersonStatus(person({ morningMood: 'okay', eveningMood: 'good' }))).toMatchObject({
      label: 'Improving through the day',
      tone: 'good',
    });
  });

  it('shows support requests as amber unless the day also dropped', () => {
    expect(describePersonStatus(person({ riskReason: 'support', morningMood: 'good' }))).toMatchObject({
      label: 'Asked for support',
      tone: 'warn',
    });
    expect(
      describePersonStatus(person({ riskReason: 'support', morningMood: 'excellent', eveningMood: 'stressed' })).tone,
    ).toBe('bad');
  });
});
