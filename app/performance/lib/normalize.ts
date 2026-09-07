import type {
  BranchCategoryRow,
  DailySalesRow,
  PerformanceApiResponse,
  PerformanceChartPoint,
  PerformanceDashboardData,
  PerformanceMasterData,
  StoreSalesRow,
  UnassignedSalesRow,
} from '@/api/types/reports-performance';

export function unwrapPerformanceResponse<T>(body: PerformanceApiResponse<T>): T {
  if (body?.success !== false && body.data != null) return body.data;
  throw new Error(
    body?.error?.details || body?.message || 'Failed to fetch performance data'
  );
}

function asChartPoints(raw: unknown): PerformanceChartPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((point) => {
      const row = point as Record<string, unknown>;
      const value = Number(row.value);
      if (!Number.isFinite(value)) return null;
      return {
        label: String(row.label ?? row.name ?? ''),
        value,
      };
    })
    .filter((p): p is PerformanceChartPoint => p != null);
}

export function normalizeMasterData(masterData: unknown): PerformanceMasterData | undefined {
  if (!masterData || typeof masterData !== 'object') return undefined;
  const md = masterData as Record<string, unknown>;
  const salespeopleRaw = md.salesPeople ?? md.salespeople;

  return {
    branches: Array.isArray(md.branches)
      ? md.branches.map((b: Record<string, unknown>) => ({
          id: String(b.id || ''),
          code: String(b.code || ''),
          name: String(b.name || ''),
          countryCode: b.countryCode ? String(b.countryCode) : undefined,
        }))
      : [],
    products: Array.isArray(md.products)
      ? md.products.map((p: Record<string, unknown>) => ({
          id: String(p.id || ''),
          code: String(p.code || ''),
          name: String(p.name || ''),
        }))
      : [],
    salespeople: Array.isArray(salespeopleRaw)
      ? (salespeopleRaw as Record<string, unknown>[]).map((sp) => ({
          id: String(sp.id || ''),
          name: String(sp.name || ''),
        }))
      : [],
    paymentMethods: Array.isArray(md.paymentMethods)
      ? md.paymentMethods.map((pm: Record<string, unknown>) => ({
          id: String(pm.id || ''),
          name: String(pm.name || ''),
        }))
      : [],
    customerCategories: Array.isArray(md.customerCategories)
      ? md.customerCategories.map((cc: Record<string, unknown>) => ({
          id: String(cc.id || ''),
          name: String(cc.name || ''),
        }))
      : [],
  };
}

function normalizeDailyDateField(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  const isoDay = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/.exec(s);
  if (isoDay) return isoDay[1];
  return s;
}

function normalizeSalesPerStore(storeData: unknown): StoreSalesRow[] {
  if (!Array.isArray(storeData)) return [];
  return storeData.map((store: Record<string, unknown>) => ({
    storeId: String(store.storeId || store.store || ''),
    storeName: String(store.storeName || store.store || ''),
    countryCode: store.countryCode ? String(store.countryCode) : undefined,
    transactionCount: Number(store.transactionCount) || 0,
    totalRevenue: Number(store.totalRevenue) || 0,
    grossProfit: Number(store.grossProfit || store.totalGP) || 0,
    grossProfitPercentage: Number(store.grossProfitPercentage || store.gpPercentage) || 0,
    uniqueClients: Number(store.uniqueClients || store.uniqueCustomers) || 0,
    averageTransactionValue: Number(store.averageTransactionValue || store.avgBasket) || 0,
    basketRanges: store.basketRanges
      ? {
          under500: Number((store.basketRanges as Record<string, unknown>).under500) || 0,
          range500to2000:
            Number((store.basketRanges as Record<string, unknown>).range500to2000) || 0,
          range2000to5000:
            Number((store.basketRanges as Record<string, unknown>).range2000to5000) || 0,
          over5000: Number((store.basketRanges as Record<string, unknown>).over5000) || 0,
        }
      : undefined,
  }));
}

function normalizeDailySales(dailyData: unknown): DailySalesRow[] {
  if (!Array.isArray(dailyData)) return [];
  return dailyData.map((day: Record<string, unknown>) => {
    const basketCount = Number(day.basketCount || day.transactionCount) || 0;
    const salesR = Number(day.salesR || day.totalRevenue) || 0;
    let basketValue = Number(day.basketValue);
    if (!Number.isFinite(basketValue)) {
      basketValue = basketCount > 0 ? salesR / basketCount : 0;
    }
    return {
      date: normalizeDailyDateField(day.date),
      dayOfWeek: String(day.dayOfWeek || ''),
      basketCount,
      basketValue,
      clientsQty: Number(day.clientsQty || day.uniqueCustomers) || 0,
      salesR,
      gpR: Number(day.gpR || day.totalGP) || 0,
      gpPercentage: Number(day.gpPercentage) || 0,
    };
  });
}

function normalizeBranchCategory(branchData: unknown): BranchCategoryRow[] {
  if (!Array.isArray(branchData)) return [];
  return branchData.map((branch: Record<string, unknown>) => {
    const total = (branch.total ?? {}) as Record<string, unknown>;
    return {
      branchId: String(branch.branchId || ''),
      branchName: String(branch.branchName || ''),
      countryCode: branch.countryCode ? String(branch.countryCode) : undefined,
      categories: (branch.categories as BranchCategoryRow['categories']) || {},
      total: {
        basketValue: Number(total.basketValue) || 0,
        basketCount: Number(total.basketCount) || 0,
        clientsQty: Number(total.clientsQty) || 0,
        salesR: Number(total.salesR) || 0,
        gpR: Number(total.gpR) || 0,
        gpPercentage: Number(total.gpPercentage) || 0,
      },
    };
  });
}

function normalizeUnassignedSales(rows: unknown): UnassignedSalesRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: Record<string, unknown>) => ({
    docNumber: String(r.docNumber ?? ''),
    docType: Number(r.docType) || 0,
    saleDate: String(r.saleDate ?? ''),
    amountExclTax: Number(r.amountExclTax) || 0,
    lineCount: Number(r.lineCount) || 0,
    storeCode: String(r.storeCode ?? ''),
    branchName:
      r.branchName != null && String(r.branchName).trim() !== ''
        ? String(r.branchName)
        : null,
    cashierUserId:
      r.cashierUserId != null && String(r.cashierUserId).trim() !== ''
        ? String(r.cashierUserId)
        : null,
    sourceCountryCode: r.sourceCountryCode != null ? String(r.sourceCountryCode) : undefined,
  }));
}

export function normalizeDashboardData(data: Record<string, unknown>): PerformanceDashboardData {
  const charts = (data.charts ?? {}) as Record<string, Record<string, unknown>>;
  const summary = (data.summary ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const currency = data.currency as Record<string, unknown> | undefined;
  const consolidated = data.revenueChartConsolidated as Record<string, unknown> | undefined;

  return {
    summary: {
      totalRevenue: Number(summary.totalRevenue) || 0,
      totalTarget: Number(summary.totalTarget) || 0,
      performanceRate: Number(summary.performanceRate) || 0,
      transactionCount: Number(summary.transactionCount) || 0,
      averageOrderValue: Number(summary.averageOrderValue) || 0,
      averageItemsPerBasket: Number(summary.averageItemsPerBasket) || 0,
      totalGP: summary.totalGP != null ? Number(summary.totalGP) : undefined,
    },
    charts: {
      revenueTrend: {
        data: asChartPoints(charts.revenueTrend?.data),
        targetValue: Number(charts.revenueTrend?.targetValue) || 0,
      },
      hourlySales: {
        data: asChartPoints(charts.hourlySales?.data),
        targetValue: Number(charts.hourlySales?.targetValue) || 0,
      },
      salesByCategory: {
        data: asChartPoints(charts.salesByCategory?.data),
        total: Number(charts.salesByCategory?.total) || 0,
      },
      branchPerformance: {
        data: asChartPoints(charts.branchPerformance?.data),
        averageTarget: Number(charts.branchPerformance?.averageTarget) || 0,
      },
      topProducts: {
        data: asChartPoints(charts.topProducts?.data),
        total: Number(charts.topProducts?.total) || 0,
      },
      salesBySalesperson: {
        data: asChartPoints(charts.salesBySalesperson?.data),
      },
      customerComposition: {
        data: asChartPoints(charts.customerComposition?.data),
        total: Number(charts.customerComposition?.total) || 0,
      },
      gpTrend: charts.gpTrend
        ? { data: asChartPoints(charts.gpTrend.data) }
        : undefined,
    },
    salesPerStore: normalizeSalesPerStore(data.salesPerStore),
    dailySalesPerformance: normalizeDailySales(data.dailySalesPerformance),
    branchCategoryPerformance: normalizeBranchCategory(data.branchCategoryPerformance),
    totalUniqueClients:
      data.totalUniqueClients != null ? Number(data.totalUniqueClients) : undefined,
    totalDistinctInvoices:
      data.totalDistinctInvoices != null ? Number(data.totalDistinctInvoices) : undefined,
    unassignedSales: normalizeUnassignedSales(data.unassignedSales),
    revenueChartConsolidated: consolidated
      ? {
          totalRevenue: Number(consolidated.totalRevenue) || 0,
          totalTarget: Number(consolidated.totalTarget) || 0,
          countries: Array.isArray(consolidated.countries)
            ? consolidated.countries.map((c) => String(c))
            : [],
        }
      : undefined,
    currency: currency
      ? {
          code: String(currency.code || 'ZAR'),
          symbol: String(currency.symbol || 'R'),
          locale: String(currency.locale || 'en-ZA'),
          name: String(currency.name || 'South African Rand'),
        }
      : undefined,
    metadata: {
      lastUpdated: String(metadata.lastUpdated || new Date().toISOString()),
      dataQuality: String(metadata.dataQuality || 'good'),
      recordCount: Number(metadata.recordCount) || 0,
      countryCode: metadata.countryCode ? String(metadata.countryCode) : undefined,
    },
    masterData: normalizeMasterData(data.masterData),
  };
}
