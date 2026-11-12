import { describe, expect, it } from 'vitest';
import type { StoreOperationsStore } from '@/api/types/store-operations';
import { getCountryFlag } from '@/lib/utils/country-flags';
import {
  kpiIndicatorClass,
  kpiPercentClass,
  nextCardFilter,
  openingTone,
  statusPillClass,
  storeMatchesCard,
} from './store-operations-content';

function store(partial: Partial<StoreOperationsStore>): StoreOperationsStore {
  return {
    branchUid: 1,
    name: 'BitMidrand',
    country: 'South Africa',
    region: 'Gauteng',
    scheduledOpen: '07:00',
    scheduledClose: '17:30',
    actualOpen: '07:00',
    actualClose: null,
    status: 'open',
    openedLate: false,
    checklistPercent: 0,
    ...partial,
  };
}

describe('openingTone', () => {
  it('uses red for missed, amber for late, blue for early, and green for on time', () => {
    expect(openingTone(store({ status: 'missed', actualOpen: null }))).toBe('missed');
    expect(statusPillClass('missed')).toContain('bg-red-600');
    expect(openingTone(store({ openedLate: true, actualOpen: '07:25' }))).toBe('late');
    expect(statusPillClass('late')).toContain('bg-amber-500');
    expect(openingTone(store({ actualOpen: '06:40' }))).toBe('early');
    expect(statusPillClass('early')).toContain('bg-blue-600');
    expect(openingTone(store({ actualOpen: '07:03' }))).toBe('on_time');
    expect(statusPillClass('on_time')).toContain('bg-emerald-600');
    expect(openingTone(store({ status: 'not_open', actualOpen: null }))).toBe('neutral');
  });
});

describe('storeMatchesCard', () => {
  const rows = [
    store({ branchUid: 1, actualOpen: '07:00', openedLate: false, status: 'open' }),
    store({ branchUid: 2, actualOpen: '07:25', openedLate: true, status: 'open' }),
    store({ branchUid: 3, status: 'missed', actualOpen: null, openedLate: false }),
    store({
      branchUid: 4,
      status: 'closed',
      actualOpen: '07:00',
      actualClose: '17:20',
      checklistPercent: 100,
    }),
    store({
      branchUid: 5,
      status: 'closed',
      actualOpen: '07:00',
      actualClose: '18:10',
      checklistPercent: 40,
    }),
  ];

  it('keeps every row for total stores and toggles a card off', () => {
    expect(rows.filter((row) => storeMatchesCard(row, 'all'))).toHaveLength(5);
    expect(nextCardFilter('late', 'late')).toBe('all');
    expect(nextCardFilter('late', 'all')).toBe('all');
    expect(nextCardFilter('all', 'missed')).toBe('missed');
  });

  it('filters each highlight card to its matching rows', () => {
    expect(rows.filter((row) => storeMatchesCard(row, 'opened_on_time')).map((row) => row.branchUid)).toEqual([1, 4, 5]);
    expect(rows.filter((row) => storeMatchesCard(row, 'late')).map((row) => row.branchUid)).toEqual([2]);
    expect(rows.filter((row) => storeMatchesCard(row, 'missed')).map((row) => row.branchUid)).toEqual([3]);
    expect(rows.filter((row) => storeMatchesCard(row, 'closed_on_time')).map((row) => row.branchUid)).toEqual([4]);
    expect(rows.filter((row) => storeMatchesCard(row, 'checklists')).map((row) => row.branchUid)).toEqual([4]);
  });
});

describe('kpi colors', () => {
  it('is red below 50 and green at 50 or above', () => {
    expect(kpiIndicatorClass(49)).toContain('bg-red-500');
    expect(kpiPercentClass(49)).toContain('text-red-600');
    expect(kpiIndicatorClass(50)).toContain('bg-emerald-500');
    expect(kpiPercentClass(50)).toContain('text-emerald-600');
    expect(kpiIndicatorClass(null)).toContain('bg-muted-foreground/25');
    expect(kpiPercentClass(null)).toBeUndefined();
  });
});

describe('branch country flag', () => {
  it('resolves the country names shown on the dashboard', () => {
    expect(getCountryFlag('South Africa').flag).toBe('🇿🇦');
    expect(getCountryFlag('Mozambique').flag).toBe('🇲🇿');
  });
});
