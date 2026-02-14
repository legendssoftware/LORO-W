/**
 * Shared types for report list/analytics responses across domains.
 * Aligned with server controller response shapes.
 */

/** Server-generated report payload (GET /:domain/report). All chart data in one response. */
export interface DomainReportResponse {
  total: number;
  byStatus: { name: string; value: number }[];
  byDay: { date: string; count: number }[];
  meta: { from: string; to: string };
}

export interface ClaimsListResponse {
  data?: Array<{
    uid: number;
    title?: string;
    amount?: number;
    status: string;
    claimRef?: string;
    category?: string;
    createdAt?: string;
  }>;
  meta?: { total: number };
}

export interface LeadsListResponse {
  data?: Array<{
    uid: number;
    name?: string;
    status: string;
    source?: string;
    temperature?: string;
    leadScore?: number;
    createdAt?: string;
  }>;
  meta?: { total: number };
}

export interface CheckInsListResponse {
  message?: string;
  checkIns: Array<{
    uid: number;
    checkInTime: string;
    checkOutTime?: string | null;
    checkInLocation: string;
    duration?: string | null;
    owner?: { name?: string };
    client?: { name?: string } | null;
  }>;
}

export interface ApprovalsListResponse {
  data?: Array<{
    uid: number;
    status: string;
    type?: string;
    createdAt?: string;
    submittedAt?: string;
  }>;
  meta?: { total: number };
}

export interface InteractionsListResponse {
  data?: Array<{
    uid: number;
    type?: string;
    createdAt?: string;
  }>;
  meta?: { total: number };
}

export interface IotAnalyticsSummary {
  message?: string;
  summary?: Record<string, unknown>;
}

export interface PayslipsListResponse {
  data?: Array<{
    uid: number;
    user?: { name?: string };
    period?: string;
    createdAt?: string;
  }>;
  meta?: { total: number };
}

export interface RewardsLeaderboardResponse {
  data?: Array<{ user?: { name?: string }; xp?: number }>;
}

export interface TrackingCustomRangeResponse {
  message?: string;
  data?: {
    trackingPoints?: Array<{ latitude: number; longitude: number; timestamp?: number }>;
    analytics?: {
      totalDistance?: number;
      averageSpeed?: number;
      timeSpentMoving?: number;
      locationsVisited?: number;
    };
    user?: { uid: number; name?: string };
  };
}

export interface TrackingAnalyticsSummaryResponse {
  message?: string;
  summary?: Record<string, unknown>;
}

export interface ProductsListResponse {
  data?: Array<{
    uid: number;
    name?: string;
    sku?: string;
    category?: string;
  }>;
  meta?: { total: number };
}

export interface ResellersListResponse {
  resellers?: Array<{
    uid: number;
    name?: string;
    email?: string;
  }>;
  message?: string;
}

export interface LeaveListResponse {
  data?: Array<{
    uid: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: string;
    duration?: number;
    createdAt?: string;
  }>;
  meta?: { total: number };
}

export interface ShopBestSellersResponse {
  products?: Array<{
    uid: number;
    name?: string;
    sku?: string;
    totalSold?: number;
    revenue?: number;
  }>;
}
