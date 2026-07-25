/** ERP performance types — will align with rebuilt server reports API. */

export interface BranchMonthlySalesPoint {
  month: string;
  totalRevenue: number | null;
  chartStoreId?: string;
}

export interface PerformanceDashboardResponse {
  salesPerStore?: Array<Record<string, unknown>>;
  masterData?: {
    branches?: Array<Record<string, unknown>>;
  };
  [key: string]: unknown;
}
