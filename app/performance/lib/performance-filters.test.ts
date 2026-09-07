import { describe, expect, it } from 'vitest';
import {
  getDefaultPerformanceFilters,
  rehydratePerformanceFilters,
  selectHasActiveFilters,
  stableFiltersKey,
} from './performance-filters';

describe('rehydratePerformanceFilters', () => {
  it('always resets the date range to today', () => {
    const today = getDefaultPerformanceFilters().dateRange;
    const result = rehydratePerformanceFilters({
      dateRange: { startDate: '2020-01-01', endDate: '2020-01-31' },
      countries: ['sa', 'bot'],
      branchIds: ['B015'],
    });
    expect(result.dateRange).toEqual(today);
    expect(result.countries).toEqual(['SA', 'BOT']);
    expect(result.branchIds).toEqual(['B015']);
  });

  it('returns defaults for invalid stored blobs', () => {
    expect(rehydratePerformanceFilters(null).dateRange).toEqual(
      getDefaultPerformanceFilters().dateRange
    );
  });
});

describe('selectHasActiveFilters', () => {
  it('is false for default today-only filters', () => {
    expect(selectHasActiveFilters(getDefaultPerformanceFilters())).toBe(false);
  });

  it('is true when countries are set', () => {
    expect(
      selectHasActiveFilters({
        ...getDefaultPerformanceFilters(),
        countries: ['SA'],
      })
    ).toBe(true);
  });
});

describe('stableFiltersKey', () => {
  it('treats country order as equivalent', () => {
    const a = stableFiltersKey({ countries: ['SA', 'BOT'] });
    const b = stableFiltersKey({ countries: ['BOT', 'SA'] });
    expect(a).toBe(b);
  });
});
