export interface StoreOperationsKpi {
  key: string;
  label: string;
  percent: number | null;
}

export interface StoreOperationsAlert {
  branchUid: number;
  branchName: string;
  title: string;
  detail: string;
  severity: 'warning' | 'danger';
}

export interface StoreOperationsStore {
  branchUid: number;
  name: string;
  alias?: string | null;
  country: string;
  region: string;
  scheduledOpen: string | null;
  scheduledClose: string | null;
  actualOpen: string | null;
  actualClose: string | null;
  status: string;
  openedLate: boolean;
  checklistPercent: number;
}

export interface StoreOperationsMapPoint {
  branchUid: number;
  name: string;
  lat: number;
  lng: number;
  status: string;
}

export interface StoreOperationsDashboard {
  date: string;
  summary: {
    totalStores: number;
    openedOnTime: number;
    openedOnTimePercent: number | null;
    lateOpenings: number;
    latePercent: number | null;
    missedOpenings: number;
    closedOnTime: number;
    closedOnTimePercent: number | null;
    checklistsCompleted: number;
    checklistsPercent: number | null;
  };
  stores: StoreOperationsStore[];
  kpis: StoreOperationsKpi[];
  alerts: StoreOperationsAlert[];
  map: StoreOperationsMapPoint[];
  filters: {
    countries: string[];
    regions: string[];
  };
  country?: string;
  region?: string;
}

export interface StoreOperationsDashboardQuery {
  date?: string;
  country?: string;
  region?: string;
}

export type StockTakeLineStatus = 'outstanding' | 'matched' | 'recount' | 'needs_approval' | 'escalated';
export type StockTakeBranchStatus = 'empty' | 'not_started' | 'in_progress' | 'completed' | 'needs_approval' | 'escalated';

export interface StockTakeAttempt {
  sequence: number;
  label: string;
  quantity: number;
  deltaFromPrevious: number | null;
}

export interface StockTakeMetrics {
  productCount: number;
  categoryCount: number;
  counted: number;
  outstanding: number;
  matched: number;
  recounts: number;
  discrepancies: number;
  needsApproval: number;
  escalated: number;
  shortageUnits: number;
  surplusUnits: number;
  completionPercent: number | null;
}

export interface StockTakeLine {
  productUid: number;
  name: string;
  sku: string;
  description: string | null;
  unit: string | null;
  categoryKey: string;
  category: string;
  systemQuantity: number;
  countedQuantity: number | null;
  finalQuantity: number | null;
  variance: number | null;
  variancePercent: number | null;
  attemptCount: number;
  status: StockTakeLineStatus;
  attempts: StockTakeAttempt[];
  countedAt: string | null;
  fourthCountReplacedThird: boolean;
}

export interface StockTakeCategory extends StockTakeMetrics {
  key: string;
  label: string;
  lines: StockTakeLine[];
}

export interface StockTakeBranch extends StockTakeMetrics {
  branchUid: number;
  name: string;
  alias: string | null;
  ref: string | null;
  country: string;
  region: string;
  cycleIndex: 1 | 2 | 3;
  status: StockTakeBranchStatus;
  countedBy: string | null;
  sessionStatus: 'in_progress' | 'completed' | null;
  startedAt: string | null;
  lastCountedAt: string | null;
  categories: StockTakeCategory[];
}

export interface StockTakeAttentionItem {
  branchUid: number;
  branchName: string;
  category: string;
  productUid: number;
  name: string;
  sku: string;
  variance: number;
  attemptCount: number;
  status: StockTakeLineStatus;
}

export interface StockTakeManagement {
  date: string;
  cycleIndex: 1 | 2 | 3;
  limitations: string[];
  summary: StockTakeMetrics & { branchCount: number };
  branches: StockTakeBranch[];
  largestDiscrepancies: StockTakeAttentionItem[];
}

export interface StockTakeManagementQuery {
  date?: string;
  cycle?: 1 | 2 | 3;
}
