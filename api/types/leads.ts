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
  ownerId?: number;
}

export interface GetLeadsReportParams {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

/** Response from POST /leads/import-csv */
export interface LeadImportResponse {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  assignments?: Array<{ leadId: number; userId: number; userName: string }>;
}

/** Payload for POST /leads (create lead). branch is required; others optional. Aligned with APK and CreateLeadDto. */
export interface CreateLeadPayload {
  branch: { uid: number };
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: string;
  source?: string;
  temperature?: string;
  priority?: string;
  /** Lead profile image URL (after upload). */
  image?: string;
  /** Attachment URLs (after upload). */
  attachments?: string[];
  jobTitle?: string;
  industry?: string;
  businessSize?: string;
  decisionMakerRole?: string;
  intent?: string;
  userQualityRating?: number;
  lifecycleStage?: string;
  budgetRange?: string;
  estimatedValue?: number;
  purchaseTimeline?: string;
  preferredCommunication?: string;
  timezone?: string;
  bestContactTime?: string;
  painPoints?: string;
  referralSource?: string;
  competitorInfo?: string;
  campaignName?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
}

/** Response from POST /leads (create). Server returns { message, data }. */
export interface CreateLeadResponse {
  message: string;
  data: LeadListItem | null;
}
