export interface PerformanceFilters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  countries?: string[];
  location?: {
    county?: string;
    province?: string;
    city?: string;
    suburb?: string;
  };
  product?: {
    category?: string;
    productIds?: string[];
  };
  priceRange?: {
    min: number;
    max: number;
  };
  branchIds?: string[];
  salesPersonIds?: string[];
  paymentMethodIds?: string[];
  excludedCategories?: string[];
  includeCustomerCategories?: string[];
  excludeCustomerCategories?: string[];
}

export interface PerformanceFilterOption {
  id: string;
  name: string;
  code?: string;
  countryCode?: string;
}

export interface PerformanceMasterData {
  branches: PerformanceFilterOption[];
  products: PerformanceFilterOption[];
  salespeople: PerformanceFilterOption[];
  paymentMethods: PerformanceFilterOption[];
  customerCategories?: PerformanceFilterOption[];
}

export interface PerformanceChartPoint {
  label: string;
  value: number;
}

export interface StoreSalesRow {
  storeId: string;
  storeName: string;
  countryCode?: string;
  transactionCount: number;
  totalRevenue: number;
  grossProfit: number;
  grossProfitPercentage: number;
  uniqueClients: number;
  averageTransactionValue: number;
  basketRanges?: {
    under500: number;
    range500to2000: number;
    range2000to5000: number;
    over5000: number;
  };
}

export interface DailySalesRow {
  date: string;
  dayOfWeek: string;
  basketCount: number;
  basketValue: number;
  clientsQty: number;
  salesR: number;
  gpR: number;
  gpPercentage: number;
}

export interface UnassignedSalesRow {
  docNumber: string;
  docType: number;
  saleDate: string;
  amountExclTax: number;
  lineCount: number;
  storeCode: string;
  branchName: string | null;
  cashierUserId: string | null;
  sourceCountryCode?: string;
}

export interface BranchCategoryRow {
  branchId: string;
  branchName: string;
  countryCode?: string;
  categories: Record<
    string,
    {
      categoryName: string;
      salesR: number;
      gpR: number;
      gpPercentage: number;
    }
  >;
  total: {
    basketValue: number;
    basketCount: number;
    clientsQty: number;
    salesR: number;
    gpR: number;
    gpPercentage: number;
  };
}

export interface PerformanceDashboardSummary {
  totalRevenue: number;
  totalTarget: number;
  performanceRate: number;
  transactionCount: number;
  averageOrderValue: number;
  averageItemsPerBasket: number;
  totalGP?: number;
}

export interface PerformanceDashboardCharts {
  revenueTrend: { data: PerformanceChartPoint[]; targetValue: number };
  hourlySales: { data: PerformanceChartPoint[]; targetValue: number };
  salesByCategory: { data: PerformanceChartPoint[]; total: number };
  branchPerformance: { data: PerformanceChartPoint[]; averageTarget: number };
  topProducts: { data: PerformanceChartPoint[]; total: number };
  salesBySalesperson: { data: PerformanceChartPoint[] };
  customerComposition: { data: PerformanceChartPoint[]; total: number };
  gpTrend?: { data: PerformanceChartPoint[] };
}

export interface PerformanceDashboardData {
  summary: PerformanceDashboardSummary;
  charts: PerformanceDashboardCharts;
  salesPerStore: StoreSalesRow[];
  dailySalesPerformance: DailySalesRow[];
  branchCategoryPerformance: BranchCategoryRow[];
  totalUniqueClients?: number;
  totalDistinctInvoices?: number;
  unassignedSales: UnassignedSalesRow[];
  revenueChartConsolidated?: {
    totalRevenue: number;
    totalTarget: number;
    countries: string[];
  };
  currency?: {
    code: string;
    symbol: string;
    locale: string;
    name: string;
  };
  metadata: {
    lastUpdated: string;
    dataQuality: string;
    recordCount: number;
    countryCode?: string;
  };
  masterData?: PerformanceMasterData;
}

export interface StoreMonthlyYtdMonthRow {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  salesPerStore: Array<Record<string, unknown>>;
}

export interface StoreMonthlyYtdResponse {
  months: StoreMonthlyYtdMonthRow[];
}

export interface ConsolidatedBranchData {
  branchId: string;
  branchName: string;
  totalRevenue: number;
  transactionCount?: number;
  grossProfit?: number;
  grossProfitPercentage?: number;
}

export interface ConsolidatedIncomeStatementCountry {
  countryCode: string;
  countryName: string;
  currency: {
    code: string;
    symbol: string;
    locale: string;
    name: string;
  };
  branches: ConsolidatedBranchData[];
  totalRevenue: number;
  branchCount?: number;
}

export interface PerformanceExchangeRate {
  code: string;
  rate: number;
}

export interface ConsolidatedIncomeStatementData {
  data: ConsolidatedIncomeStatementCountry[];
  startDate: string;
  endDate: string;
  totalCountries: number;
  totalBranches: number;
  exchangeRates?: PerformanceExchangeRate[];
  grandTotalZAR?: number;
  consolidatedGrossProfitZAR?: number;
}

export interface PerformanceApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    details?: string;
  };
}
