'use client';

import { useMemo } from 'react';
import type { BranchListItem } from '@/api/types/branch';
import type { BranchCatchmentOpportunity } from '@/api/types/site-opportunity';
import type { PerformanceDashboardResponse } from '@/lib/types/erp-performance';
import {
  findBranchListItem,
  findSalesPerStoreForBranch,
  monthlyDateRange,
  revenueToMonthlyAverage,
  salesPerStoreKey,
} from '@/lib/utils/sales-per-store-match';

export type EnrichCatchmentRevenueOptions = {
  /** Inclusive period for the salesPerStore totals (defaults to current calendar month). */
  startDate?: string;
  endDate?: string;
};

/** Fill/align actualRevenueZAR from performance / ERP salesPerStore (country-scoped, ZAR). */
export function enrichCatchmentsWithDashboardRevenue(
  catchments: BranchCatchmentOpportunity[],
  branches: BranchListItem[],
  dashboard: PerformanceDashboardResponse | null | undefined,
  options?: EnrichCatchmentRevenueOptions,
): BranchCatchmentOpportunity[] {
  const salesPerStore = dashboard?.salesPerStore ?? [];
  if (salesPerStore.length === 0) return catchments;

  const masterBranches = dashboard?.masterData?.branches;
  const month = monthlyDateRange();
  const startDate = options?.startDate ?? month.startDate;
  const endDate = options?.endDate ?? month.endDate;
  const usedStoreKeys = new Set<string>();

  return catchments.map((catchment) => {
    const branch = findBranchListItem(catchment.branchId, branches);
    if (!branch) return catchment;

    const store = findSalesPerStoreForBranch(
      branch,
      salesPerStore,
      masterBranches,
      usedStoreKeys,
    );
    if (store?.totalRevenue == null || !Number.isFinite(store.totalRevenue)) {
      return catchment;
    }

    usedStoreKeys.add(salesPerStoreKey(store));
    // Period is typically one calendar month; still normalize to monthly avg if range spans months.
    const actualRevenueZAR = revenueToMonthlyAverage(
      store.totalRevenue,
      startDate,
      endDate,
    );

    return {
      ...catchment,
      actualRevenueZAR,
      revenueGapZAR: catchment.potentialHighZAR - actualRevenueZAR,
    };
  });
}

export function useEnrichedCatchments(
  catchments: BranchCatchmentOpportunity[],
  branches: BranchListItem[],
  dashboard: PerformanceDashboardResponse | null | undefined,
): BranchCatchmentOpportunity[] {
  return useMemo(
    () => enrichCatchmentsWithDashboardRevenue(catchments, branches, dashboard),
    [catchments, branches, dashboard],
  );
}
