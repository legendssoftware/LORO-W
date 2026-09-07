import { describe, expect, it } from 'vitest';
import { PERFORMANCE_COUNTRY_IDS, PERFORMANCE_FILTER_COUNTRIES } from './constants';
import {
  getCountryDisplayName,
  normalizePerformanceCountryCode,
} from './performance-countries';

describe('performance countries', () => {
  it('includes Zim (Incognito) as ZWI without aliasing Zimbabwe', () => {
    expect(PERFORMANCE_COUNTRY_IDS).toContain('ZWI');
    expect(PERFORMANCE_FILTER_COUNTRIES.some((c) => c.id === 'ZWI' && c.name === 'Zim (Incognito)')).toBe(
      true
    );
    expect(normalizePerformanceCountryCode('zimbabwe')).toBe('ZW');
    expect(normalizePerformanceCountryCode('Zim (Incognito)')).toBe('ZWI');
    expect(getCountryDisplayName('ZWI')).toBe('Zim (Incognito)');
  });
});
