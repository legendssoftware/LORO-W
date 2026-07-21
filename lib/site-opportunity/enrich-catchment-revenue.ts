'use client';

import { useMemo } from 'react';
import type { BranchListItem } from '@/api/types/branch';
import type { BranchCatchmentOpportunity } from '@/api/types/site-opportunity';
import type { PerformanceDashboardResponse } from '@/api/endpoints/performance-dashboard';
import { normalizeStoreCode } from '@/lib/utils/branch-store-code';
import {
  findBranchListItem,
  findSalesPerStoreForBranch,
  revenueToMonthlyAverage,
  ytdDateRange,
} from '@/lib/utils/sales-per-store-match';

/** Fill missing actualRevenueZAR from performance dashboard salesPerStore (APK-style matching). */
export function enrichCatchmentsWithDashboardRevenue(
  catchments: BranchCatchmentOpportunity[],
  branches: BranchListItem[],
  dashboard: PerformanceDashboardResponse | null | undefined,
): BranchCatchmentOpportunity[] {
  const salesPerStore = dashboard?.salesPerStore ?? [];
  if (salesPerStore.length === 0) return catchments;

  const masterBranches = dashboard?.masterData?.branches;
  const { startDate, endDate } = ytdDateRange();
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
