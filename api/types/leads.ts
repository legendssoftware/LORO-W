/**
 * Types for leads API responses and params.
 * Aligned with server leads controller and LeadsService.
 */

export interface LeadListItem {
  uid: number;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status: string;
  source?: string;
  notes?: string;
  leadScore?: number;
  temperature?: string;
  priority?: string;
  estimatedValue?: number;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  totalInteractions?: number;
  averageResponseTime?: number;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
  owner?: { uid?: number; name?: string; surname?: string; email?: string };
  assignees?: Array<{ uid?: number; clerkUserId?: string; name?: string; email?: string }>;
  [key: string]: unknown;
}

export interface LeadsListResponse {
  data: LeadListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface LeadsForUserStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  negotiation: number;
  won: number;
  lost: number;
  avgLeadScore: number;
}

export interface LeadsForUserResponse {
  leads: LeadListItem[];
  message: string;
  stats: LeadsForUserStats;
}

export interface LeadDetailResponse {
  lead: LeadListItem | null;
  message: string;
  stats?: unknown;
}

export interface GetLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  temperature?: string;
  minScore?: number;
  maxScore?: number;
  priority?: string;
  source?: string;
}

export interface GetLeadsReportParams {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}
