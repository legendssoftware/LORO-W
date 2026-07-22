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

/** GET /leads/report — meta includes how the date range was applied (present on current API). */
export type LeadsReportMeta = DomainReportResponse['meta'] & {
  dateBasis?: 'created' | 'activity';
};

/** GET /leads/report — extended analytics (see server LeadsReportResponseDto). */
export interface LeadsReportResponse extends Omit<DomainReportResponse, 'meta'> {
  meta: LeadsReportMeta;
  totalEstimatedValue: number;
  valueByStatus: { name: string; value: number }[];
  byRegion: { name: string; value: number }[];
  byUser: { name: string; value: number }[];
  byBranch: { name: string; value: number }[];
  bySource: { name: string; value: number }[];
  /** When `from` === `to` (single day): new leads per hour 0–23 in org timezone. */
  byHour?: { hour: number; count: number }[];
  /** With activity vs no activity (interactions and/or edits after creation). */
  byEngagement?: { name: string; value: number }[];
}

export type { ClaimsListResponse } from './claims';

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

/** Address shape for contactAddress and fullAddress (export/display). */
export interface CheckInContactAddress {
  formattedAddress?: string;
  streetNumber?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/** Single check-in item with all fields needed for 12-column export and visit detail dialog. */
export interface VisitExportItem {
  uid: number;
  ownerClerkUserId?: string | null;
  checkInTime: string;
  checkOutTime?: string | null;
  duration?: string | null;
  checkInLocation: string;
  checkOutLocation?: string | null;
  methodOfContact?: string | null;
  companyName?: string | null;
  businessType?: string | null;
  contactFullName?: string | null;
  personSeenPosition?: string | null;
  contactCellPhone?: string | null;
  contactLandline?: string | null;
  contactEmail?: string | null;
  contactAddress?: CheckInContactAddress | null;
  notes?: string | null;
  resolution?: string | null;
  quotationNumber?: string | null;
  quotationStatus?: string | null;
  salesValue?: number | null;
  salesCurrency?: string | null;
  followUp?: string | null;
  meetingLink?: string | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  contactImage?: string | null;
  fullAddress?: CheckInContactAddress | null;
  checkOutFullAddress?: CheckInContactAddress | null;
  buildingType?: string | null;
  contactMade?: boolean | null;
  media?: string[] | null;
  owner?: {
    uid?: number;
    clerkUserId?: string;
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    role?: string;
    photoURL?: string;
    avatar?: string;
    branch?: {
      uid?: number;
      name?: string;
      alias?: string | null;
    };
  };
  client?: { uid?: number; name?: string; email?: string; phone?: string; address?: CheckInContactAddress } | null;
  branch?: {
    uid?: number;
    name?: string;
    alias?: string | null;
    address?: { street?: string; suburb?: string; city?: string };
  } | null;
  organisation?: { uid?: number; name?: string; logo?: string; email?: string; phone?: string } | null;
  lead?: { uid?: number; name?: string; status?: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CheckInsListResponse {
  message?: string;
  checkIns: VisitExportItem[];
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

export type {
  PayslipListItem,
  PayslipDocumentResponse,
  PayslipsListMeta,
  PayslipsListResponse,
  PayslipStatus,
} from './payslips';

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
    brand?: string;
    price?: number;
    salePrice?: number;
    isOnPromotion?: boolean;
    imageUrl?: string;
  }>;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
