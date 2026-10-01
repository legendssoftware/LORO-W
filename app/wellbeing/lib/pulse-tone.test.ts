import { describe, expect, it } from 'vitest';
import { getIndexTone, getScoreTone } from './pulse-tone';

describe('getIndexTone', () => {
  it('colours higher-is-better indices at 40 and 70', () => {
    expect(getIndexTone('Overall Happiness', 69)).toBe('warn');
    expect(getIndexTone('Overall Happiness', 70)).toBe('good');
    expect(getIndexTone('Overall Happiness', 40)).toBe('warn');
    expect(getIndexTone('Overall Happiness', 39)).toBe('bad');
  });

  it('inverts Burnout Risk so a high value is red', () => {
    expect(getIndexTone('Burnout Risk', 20)).toBe('good');
    expect(getIndexTone('Burnout Risk', 21)).toBe('warn');
    expect(getIndexTone('Burnout Risk', 40)).toBe('warn');
    expect(getIndexTone('Burnout Risk', 41)).toBe('bad');
  });

  it('treats non-finite values as neutral', () => {
    expect(getIndexTone('Overall Happiness', Number.NaN)).toBe('neutral');
  });
});

describe('getScoreTone', () => {
  it('matches the server score bands', () => {
    expect(getScoreTone(7.5)).toBe('good');
    expect(getScoreTone(7.4)).toBe('warn');
    expect(getScoreTone(5.5)).toBe('warn');
    expect(getScoreTone(5.4)).toBe('bad');
    expect(getScoreTone(null)).toBe('neutral');
  });
});
