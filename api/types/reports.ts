/**
 * Shared API response types used across visits, leads, and list endpoints.
 * (Not tied to the legacy /reports dashboard page.)
 */

import type { VisitListItem } from './visits';

export interface ByStatusItem {
  name: string;
  value: number;
}

export interface ByDayItem {
  date: string;
  count: number;
}

export interface ReportMeta {
  from: string;
  to: string;
}

export interface DomainReportResponse {
  total: number;
  byStatus: ByStatusItem[];
  byDay: ByDayItem[];
  meta: ReportMeta;
}

/** Extended GET /check-ins/report chart series. */
export interface CheckInsReportResponse extends DomainReportResponse {
  byBranch: ByStatusItem[];
  byCountry: ByStatusItem[];
  byRegion: ByStatusItem[];
  byCustomer: ByStatusItem[];
  byCustomerType: ByStatusItem[];
  byEngagement: ByStatusItem[];
}

export interface CheckInsDispatchBranchRow {
  name: string;
  planned: number;
  completed: number;
}

export interface CheckInsDispatchSummary {
  planned: number;
  completed: number;
  inProgress: number;
  byBranch: CheckInsDispatchBranchRow[];
  meta: ReportMeta;
}

export interface CheckInsListResponse {
  message: string;
  checkIns: VisitListItem[];
}

export interface CheckInContactAddress {
  streetNumber?: string;
  street?: string;
  suburb?: string;
  city?: string;
  province?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

/** Visit row shape for tables, export, and map (normalized from VisitListItem). */
export interface VisitExportItem extends VisitListItem {
  checkInLocation: string;
  checkOutLocation?: string | null;
  fullAddress?: CheckInContactAddress | null;
  checkOutFullAddress?: CheckInContactAddress | null;
  contactAddress?: CheckInContactAddress | null;
  createdAt?: string | null;
  followUp?: string | null;
  contactEmail?: string | null;
  contactCellPhone?: string | null;
  contactLandline?: string | null;
  contactImage?: string | null;
  personSeenPosition?: string | null;
  meetingLink?: string | null;
  businessType?: string | null;
  buildingType?: string | null;
  contactMade?: boolean | null;
  quotationNumber?: string | null;
  quotationStatus?: string | null;
  lead?: { uid?: number; name?: string } | null;
  leadUid?: number | null;
  salesCurrency?: string | null;
  media?: string[] | null;
  organisation?: { uid?: number; name?: string } | null;
  owner?: VisitListItem['owner'] & {
    photoURL?: string | null;
    avatar?: string | null;
    role?: string | null;
  };
}

export type LeadsReportDateBasis = 'created' | 'activity';

export interface LeadsReportResponse extends Omit<DomainReportResponse, 'meta'> {
  meta: ReportMeta & { dateBasis: LeadsReportDateBasis };
  totalEstimatedValue: number;
  valueByStatus: ByStatusItem[];
  byUser: ByStatusItem[];
  byBranch: ByStatusItem[];
  byRegion: ByStatusItem[];
  bySource: ByStatusItem[];
  byHour?: Array<{ hour: number; count: number }>;
  byEngagement: ByStatusItem[];
}

export interface ApprovalsListResponse {
  message?: string;
  approvals?: unknown[];
  data?: unknown;
  [key: string]: unknown;
}

export interface ProductsListResponse {
  message?: string;
  /** Paginated product rows from GET /products */
  data?: unknown[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  /** Legacy / alternate shapes */
  products?: unknown[];
  page?: number;
  totalPages?: number;
}

export interface ResellersListResponse {
  message?: string;
  resellers?: unknown[];
  data?: unknown;
  [key: string]: unknown;
}

export interface LeaveListResponse {
  message?: string;
  leaves?: unknown[];
  data?: unknown;
  [key: string]: unknown;
}
