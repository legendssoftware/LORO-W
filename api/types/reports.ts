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
}

/** Visit row shape for tables, export, and map (normalized from VisitListItem). */
export interface VisitExportItem extends VisitListItem {
  checkInLocation: string;
  checkOutLocation?: string | null;
  fullAddress?: CheckInContactAddress | null;
  checkOutFullAddress?: CheckInContactAddress | null;
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
  products?: unknown[];
  data?: {
    products?: unknown[];
    page?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  page?: number;
  totalPages?: number;
  [key: string]: unknown;
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
