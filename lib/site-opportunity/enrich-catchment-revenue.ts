'use client';

import { useMemo } from 'react';
import type { BranchListItem } from '@/api/types/branch';
import type { BranchCatchmentOpportunity } from '@/api/types/site-opportunity';
import type { PerformanceDashboardResponse } from '@/lib/types/erp-performance';
import { normalizeStoreCode } from '@/lib/utils/branch-store-code';
import {
  findBranchListItem,
  findSalesPerStoreForBranch,
  monthlyDateRange,
  revenueToMonthlyAverage,
} from '@/lib/utils/sales-per-store-match';

export type EnrichCatchmentRevenueOptions = {
  /** Inclusive period for the salesPerStore totals (defaults to current calendar month). */
  startDate?: string;
  endDate?: string;
};

/** Fill missing actualRevenueZAR from performance / ERP salesPerStore (APK-style matching). */
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
  const usedStoreIds = new Set<string>();

  return catchments.map((catchment) => {
    if (
      catchment.actualRevenueZAR != null &&
      Number.isFinite(catchment.actualRevenueZAR) &&
      catchment.actualRevenueZAR > 0
    ) {
      return catchment;
    }

    const branch = findBranchListItem(catchment.branchId, branches);
    if (!branch) return catchment;

    const store = findSalesPerStoreForBranch(
      branch,
      salesPerStore,
      masterBranches,
      usedStoreIds,
    );
    if (!store?.totalRevenue) return catchment;

    usedStoreIds.add(normalizeStoreCode(store.storeId));
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
