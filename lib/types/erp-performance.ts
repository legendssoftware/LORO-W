/** ERP performance types — will align with rebuilt server reports API. */

import type { MasterBranchRow, SalesPerStoreRow } from '@/lib/utils/sales-per-store-match';

export interface BranchMonthlySalesPoint {
  month: string;
  totalRevenue: number | null;
  chartStoreId?: string;
}

export interface PerformanceDashboardResponse {
  salesPerStore?: SalesPerStoreRow[];
  masterData?: {
    branches?: MasterBranchRow[];
  };
  [key: string]: unknown;
}
