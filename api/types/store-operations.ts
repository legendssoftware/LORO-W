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
