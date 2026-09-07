'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PerformanceFilters } from '@/api/types/reports-performance';
import { PERFORMANCE_FILTERS_STORAGE_KEY } from './constants';
import { getDefaultTodayDateRange } from './dates';
import {
  getDefaultPerformanceFilters,
  persistablePerformanceFilters,
  rehydratePerformanceFilters,
} from './performance-filters';
import { stableCountriesKey } from './performance-countries';

function readStoredFilters(): PerformanceFilters {
  if (typeof window === 'undefined') return getDefaultPerformanceFilters();
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_FILTERS_STORAGE_KEY);
    if (!raw) return getDefaultPerformanceFilters();
    const parsed = JSON.parse(raw) as { filters?: unknown };
    return rehydratePerformanceFilters(parsed.filters);
  } catch {
    return getDefaultPerformanceFilters();
  }
}

export function usePerformanceFilters() {
  const [filters, setFiltersState] = useState<PerformanceFilters>(getDefaultPerformanceFilters);
  const [hydrated, setHydrated] = useState(false);
  const [skipCache, setSkipCache] = useState(false);

  useEffect(() => {
    setFiltersState(readStoredFilters());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        PERFORMANCE_FILTERS_STORAGE_KEY,
        JSON.stringify({ filters: persistablePerformanceFilters(filters) })
      );
    } catch {
      /* ignore quota */
    }
  }, [filters, hydrated]);

  const setFilters = useCallback((next: PerformanceFilters) => {
    setFiltersState((current) => {
      const prevKey = stableCountriesKey(current.countries);
      const nextKey = stableCountriesKey(next.countries);
      if (prevKey !== nextKey) {
        setSkipCache(true);
        return {
          ...next,
          branchIds: undefined,
          salesPersonIds: undefined,
        };
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSkipCache(false);
    setFiltersState(getDefaultPerformanceFilters());
  }, []);

  const setDateRange = useCallback((startDate: string, endDate: string) => {
    setFiltersState((current) => ({
      ...current,
      dateRange: { startDate, endDate },
    }));
  }, []);

  const resetDateRange = useCallback(() => {
    const today = getDefaultTodayDateRange();
    setFiltersState((current) => ({ ...current, dateRange: today }));
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
    setDateRange,
    resetDateRange,
    skipCache,
    setSkipCache,
    hydrated,
  };
}
