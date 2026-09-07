import type { PerformanceFilters } from '@/api/types/reports-performance';
import { getLocalTodayIsoDate } from './dates';
import { normalizePerformanceCountryCodes } from './performance-countries';

export function getDefaultPerformanceFilters(): PerformanceFilters {
  const today = getLocalTodayIsoDate();
  return {
    dateRange: { startDate: today, endDate: today },
  };
}

export function stableFiltersKey(filters: PerformanceFilters): string {
  const normalized = {
    dateRange: filters.dateRange,
    countries: filters.countries?.slice().sort(),
    branchIds: filters.branchIds?.slice().sort(),
    salesPersonIds: filters.salesPersonIds?.slice().sort(),
    paymentMethodIds: filters.paymentMethodIds?.slice().sort(),
    excludedCategories: filters.excludedCategories?.slice().sort(),
    includeCustomerCategories: filters.includeCustomerCategories?.slice().sort(),
    excludeCustomerCategories: filters.excludeCustomerCategories?.slice().sort(),
    product: filters.product,
    priceRange: filters.priceRange,
    location: filters.location,
  };
  return JSON.stringify(normalized);
}

export function selectHasActiveFilters(filters: PerformanceFilters): boolean {
  const today = getLocalTodayIsoDate();
  const hasNonDefaultDate =
    filters.dateRange?.startDate !== today || filters.dateRange?.endDate !== today;

  return (
    hasNonDefaultDate ||
    Boolean(filters.countries?.length) ||
    Boolean(filters.branchIds?.length) ||
    Boolean(filters.salesPersonIds?.length) ||
    Boolean(filters.paymentMethodIds?.length) ||
    Boolean(filters.product?.category) ||
    Boolean(filters.product?.productIds?.length) ||
    Boolean(filters.priceRange?.min != null || filters.priceRange?.max != null) ||
    Boolean(
      filters.location?.county ||
        filters.location?.province ||
        filters.location?.city ||
        filters.location?.suburb
    ) ||
    Boolean(filters.includeCustomerCategories?.length) ||
    Boolean(filters.excludeCustomerCategories?.length) ||
    Boolean(filters.excludedCategories?.length)
  );
}

export function selectHasCustomerCategoryFilters(filters: PerformanceFilters): boolean {
  return Boolean(
    filters.excludeCustomerCategories?.length || filters.includeCustomerCategories?.length
  );
}

function ensureStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((x): x is string => typeof x === 'string');
  return out.length > 0 ? out : undefined;
}

export function rehydratePerformanceFilters(stored: unknown): PerformanceFilters {
  const todayRange = getDefaultPerformanceFilters().dateRange;

  if (!stored || typeof stored !== 'object') {
    return { dateRange: todayRange };
  }

  const s = stored as Record<string, unknown>;
  const product = s.product as { category?: string; productIds?: string[] } | undefined;
  const productIds = ensureStringArray(product?.productIds);
  const storedCountries = ensureStringArray(s.countries);

  return {
    dateRange: todayRange,
    countries: storedCountries
      ? normalizePerformanceCountryCodes(storedCountries)
      : undefined,
    branchIds: ensureStringArray(s.branchIds),
    salesPersonIds: ensureStringArray(s.salesPersonIds),
    paymentMethodIds: ensureStringArray(s.paymentMethodIds),
    excludedCategories: ensureStringArray(s.excludedCategories),
    includeCustomerCategories: ensureStringArray(s.includeCustomerCategories),
    excludeCustomerCategories: ensureStringArray(s.excludeCustomerCategories),
    location:
      s.location && typeof s.location === 'object' && s.location !== null
        ? (s.location as PerformanceFilters['location'])
        : undefined,
    priceRange:
      s.priceRange && typeof s.priceRange === 'object' && s.priceRange !== null
        ? (s.priceRange as PerformanceFilters['priceRange'])
        : undefined,
    product:
      product && (productIds !== undefined || typeof product?.category === 'string')
        ? { category: product.category, productIds }
        : undefined,
  };
}

export function persistablePerformanceFilters(
  filters: PerformanceFilters
): Omit<PerformanceFilters, 'dateRange'> {
  const { dateRange: _dateRange, ...rest } = filters;
  return rest;
}
