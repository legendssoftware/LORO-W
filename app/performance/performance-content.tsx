'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import {
  performanceQueryKeys,
  usePerformanceDashboard,
  usePerformanceMasterData,
} from '@/api/hooks/use-performance-dashboard';
import { consolidatedIncomeStatementQueryKeys } from '@/api/hooks/use-consolidated-income-statement';
import { useSessionSync, useTokenReady } from '@/api/hooks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { canAccessPerformanceTracker } from '@/lib/access';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import { FALLBACK_COUNTRY_NAMES } from './lib/constants';
import { getDefaultPerformanceFilters, selectHasActiveFilters, selectHasCustomerCategoryFilters } from './lib/performance-filters';
import { usePerformanceFilters } from './lib/use-performance-filters';
import { mapSalespersonChartNames } from './lib/salesperson-names';
import { PerformanceToolbar } from './components/performance-toolbar';
import { PerformanceFiltersDialog } from './components/performance-filters-dialog';
import { PerformanceTargetCard } from './components/performance-target-card';
import { PerformanceGpCard } from './components/performance-gp-card';
import {
  PerformanceAreaChartCard,
  PerformanceBarChartCard,
  PerformancePieChartCard,
} from './components/performance-charts';
import { PerformanceStoreYtdChart } from './components/performance-store-ytd-chart';
import { PerformanceSalesPerStoreTable } from './components/performance-sales-per-store-table';
import { PerformanceDailySalesTable } from './components/performance-daily-sales-table';
import { PerformanceBranchCategoryTable } from './components/performance-branch-category-table';
import { PerformanceConsolidatedStatement } from './components/performance-consolidated-statement';

export function PerformanceContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const queryClient = useQueryClient();
  const {
    filters,
    setFilters,
    resetFilters,
    setDateRange,
    skipCache,
    setSkipCache,
    hydrated,
  } = usePerformanceFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showConsolidatedView, setShowConsolidatedView] = useState(false);

  const canAccess = canAccessPerformanceTracker(backendUserData);
  const hasCustomerCategoryFilters = selectHasCustomerCategoryFilters(filters);
  const hasActiveFilters = selectHasActiveFilters(filters);

  const dashboardQuery = usePerformanceDashboard({
    filters,
    enabled: hydrated && !showConsolidatedView,
    skipCache: skipCache || hasCustomerCategoryFilters,
  });
  const masterQuery = usePerformanceMasterData({
    filters,
    enabled: hydrated,
  });

  const dashboardData = dashboardQuery.data;
  const masterData = dashboardData?.masterData ?? masterQuery.data;
  const currency = dashboardData?.currency?.symbol || 'R';
  const summary = dashboardData?.summary;
  const charts = dashboardData?.charts;
  const salespersonBars = useMemo(
    () => mapSalespersonChartNames(charts?.salesBySalesperson?.data, masterData),
    [charts?.salesBySalesperson?.data, masterData]
  );

  useEffect(() => {
    if (skipCache && dashboardQuery.isSuccess) {
      setSkipCache(false);
    }
  }, [skipCache, dashboardQuery.isSuccess, setSkipCache]);

  if (!isTokenReady || isSyncing || !hydrated) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
          <LoadingSpinner wrapperClassName="py-24" />
        </main>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={appPageScrollWrapClass}>
        <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
          <h1 className="text-xl font-semibold">Performance Tracker</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have access to sales performance tracking.
          </p>
        </main>
      </div>
    );
  }

  const hasData = (dashboardData?.metadata?.recordCount ?? 0) > 0;
  const errorMessage =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : 'Failed to load performance data';

  return (
    <div className={appPageScrollWrapClass} data-slot="performance-page">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col gap-4')}>
        <div className="mb-1 flex shrink-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {showConsolidatedView ? 'Consolidated Statement' : 'Performance Tracker'}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {showConsolidatedView
              ? 'Sales data across all countries and branches'
              : 'Analytics and insights dashboard'}
          </p>
        </div>

        <PerformanceToolbar
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          showConsolidatedView={showConsolidatedView}
          isRefetching={dashboardQuery.isFetching}
          onToggleFilters={() => setFiltersOpen(true)}
          onToggleConsolidatedView={() => setShowConsolidatedView((v) => !v)}
          onRefresh={() => {
            setSkipCache(true);
            void queryClient.invalidateQueries({ queryKey: performanceQueryKeys.all });
            void queryClient.invalidateQueries({
              queryKey: consolidatedIncomeStatementQueryKeys.all,
            });
            void dashboardQuery.refetch();
          }}
          onClearFilters={resetFilters}
          onDateRangeChange={setDateRange}
        />

        {dashboardQuery.isError && !showConsolidatedView ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Failed to load performance data</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{errorMessage}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void dashboardQuery.refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {showConsolidatedView ? (
          <PerformanceConsolidatedStatement filters={filters} enabled={hydrated} />
        ) : dashboardQuery.isLoading && !dashboardData ? (
          <div className="rounded-xl border bg-card py-16">
            <LoadingSpinner />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Loading performance data…
            </p>
          </div>
        ) : (
          <>
            {summary ? (
              <PerformanceTargetCard
                achieved={
                  dashboardData?.revenueChartConsolidated?.totalRevenue ?? summary.totalRevenue
                }
                target={
                  dashboardData?.revenueChartConsolidated?.totalTarget ?? summary.totalTarget
                }
                currency={currency}
                dateRange={filters.dateRange}
                footerCountries={(() => {
                  const apiCountries = dashboardData?.revenueChartConsolidated?.countries;
                  if (apiCountries && apiCountries.length > 0) return apiCountries;
                  if (!filters.countries?.length) return [...FALLBACK_COUNTRY_NAMES];
                  return undefined;
                })()}
              />
            ) : null}

            {summary?.totalGP != null ? (
              <PerformanceGpCard
                totalGP={summary.totalGP}
                totalRevenue={summary.totalRevenue}
                currency={currency}
                dateRange={filters.dateRange}
              />
            ) : null}

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {charts?.salesByCategory?.data?.length ? (
                <PerformancePieChartCard
                  title="Sales by Category"
                  description="Revenue distribution across product categories"
                  data={charts.salesByCategory.data}
                  currency={currency}
                />
              ) : null}

              {charts?.branchPerformance?.data?.length ? (
                <PerformanceBarChartCard
                  title="Top Branch Performance"
                  description="Revenue by branch"
                  data={charts.branchPerformance.data}
                />
              ) : null}

              {charts?.customerComposition?.data?.length ? (
                <PerformancePieChartCard
                  title="Payment Methods"
                  description="Sales distribution by payment type"
                  data={charts.customerComposition.data}
                  currency={currency}
                />
              ) : null}

              {charts?.topProducts?.data?.length ? (
                <PerformanceBarChartCard
                  title="Sales Per Product"
                  description="Total amounts sold by product"
                  data={charts.topProducts.data}
                  fill={ATT_CHART_HSL.c1}
                />
              ) : null}

              {salespersonBars.length > 0 ? (
                <PerformanceBarChartCard
                  title="Sales Per Salesperson"
                  description="Total sales amounts by salesperson"
                  data={salespersonBars}
                  fill={ATT_CHART_HSL.c3}
                />
              ) : null}

              {charts?.hourlySales?.data?.length ? (
                <PerformanceAreaChartCard
                  title="Hourly Sales Pattern"
                  description="Sales figures per hour (07:00 - 17:00)"
                  data={charts.hourlySales.data}
                />
              ) : null}

              {charts?.gpTrend?.data?.length ? (
                <PerformanceAreaChartCard
                  title="Gross Profit Trend"
                  description="Gross profit over time"
                  data={charts.gpTrend.data}
                />
              ) : null}
            </div>

            <PerformanceStoreYtdChart filters={filters} masterData={masterData} />
            <PerformanceSalesPerStoreTable dashboardData={dashboardData} />
            <PerformanceDailySalesTable dashboardData={dashboardData} filters={filters} />
            <PerformanceBranchCategoryTable dashboardData={dashboardData} />

            {!hasData && !dashboardQuery.isLoading ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <p className="font-medium">No performance data found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your filters to see more results
                </p>
              </div>
            ) : null}
          </>
        )}

        <PerformanceFiltersDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          currentFilters={filters}
          masterData={masterData}
          onApply={(next) => {
            setFilters(next);
            void queryClient.invalidateQueries({ queryKey: performanceQueryKeys.all });
          }}
        />
      </main>
    </div>
  );
}
