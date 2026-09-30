import { describe, expect, it } from 'vitest';
import { getMissingPulseFields, toggleContributor } from './pulse-form';

describe('getMissingPulseFields', () => {
  const morning = {
    period: 'morning' as const,
    mood: 'good' as const,
    contributors: ['health'],
    talkTo: 'none' as const,
    followUpRequested: null,
  };
  const evening = {
    period: 'evening' as const,
    mood: 'good' as const,
    contributors: ['teamwork'],
    talkTo: null,
    followUpRequested: false,
  };

  it('is complete when every section is answered, with or without a note', () => {
    expect(getMissingPulseFields(morning)).toEqual([]);
    expect(getMissingPulseFields(evening)).toEqual([]);
  });

  it('requires mood, contributors and the morning talk-to answer', () => {
    expect(getMissingPulseFields({ ...morning, mood: '', contributors: [], talkTo: null })).toEqual([
      'how you feel',
      "what's contributing",
      'whether you want to talk to someone',
    ]);
  });

  it('requires an explicit follow-up answer in the evening, and treats "No" as answered', () => {
    expect(getMissingPulseFields({ ...evening, followUpRequested: null })).toEqual([
      'whether you want a follow-up',
    ]);
    expect(getMissingPulseFields({ ...evening, followUpRequested: false })).toEqual([]);
  });
});

describe('toggleContributor', () => {
  it('adds and removes a tag', () => {
    expect(toggleContributor([], 'health', true)).toEqual(['health']);
    expect(toggleContributor(['health'], 'health', false)).toEqual([]);
  });

  it('makes "nothing in particular" exclusive', () => {
    expect(toggleContributor(['health', 'poor_sleep'], 'nothing_in_particular', true)).toEqual([
      'nothing_in_particular',
    ]);
    expect(toggleContributor(['nothing_in_particular'], 'health', true)).toEqual(['health']);
  });
});
