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
  /** Matches server `Lead.lifecycleStage` */
  lifecycleStage?: string;
  form?: string;
  channel?: string;
  labels?: string[];
  secondaryPhoneNumber?: string;
  whatsAppNumber?: string;
  estimatedValue?: number;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  totalInteractions?: number;
  averageResponseTime?: number;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
  /** ISO timestamp of the latest activity by an authenticated Clerk user (omitted when only system automation touched the lead). */
  lastActivityAt?: string;
  /** Summary for that latest Clerk-user activity (excludes system jobs). */
  lastActivitySummary?: string;
  /** Newest-first log: Clerk-user entries only in API responses (system rows filtered server-side). */
  activity?: Array<{
    at: string;
    action: string;
    summary: string;
    userId?: number;
    clerkUserId?: string;
    userName?: string;
  }>;
  owner?: {
    uid?: number;
    name?: string;
    surname?: string;
    email?: string;
    photoURL?: string | null;
    avatar?: string | null;
  };
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

export interface LeadsForUserMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetLeadsForUserParams {
  page?: number;
  limit?: number;
}

export interface LeadsForUserResponse {
  leads: LeadListItem[] | null;
  message: string;
  stats: LeadsForUserStats | null;
  meta: LeadsForUserMeta;
}

export interface LeadDetailResponse {
  lead: LeadListItem | null;
  message: string;
  stats?: unknown;
}

/** Passed as `dateBasis` on GET /leads and GET /leads/report — matches server LeadsReportDateBasis. */
export type LeadsReportDateBasis = 'created' | 'activity';

export interface GetLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  /**
   * When `startDate` and `endDate` are set: `created` (default) vs `activity` — same as GET /leads/report.
   */
  dateBasis?: LeadsReportDateBasis;
  temperature?: string;
  minScore?: number;
  maxScore?: number;
  priority?: string;
  source?: string;
  ownerId?: number;
  /**
   * `me` (default): leads you own or are assigned to.
   * `all`: entire organization (admin or owner only; server returns 403 otherwise).
   */
  scope?: 'me' | 'all';
}

export interface GetLeadsReportParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  /** Branch uid (admin/owner only; omit for all branches) */
  branchId?: number;
  ownerId?: number;
  status?: string;
  source?: string;
  search?: string;
  /**
   * `created` (default): leads created in range.
   * `activity`: leads touched in range (`updatedAt` in range after `createdAt`).
   */
  dateBasis?: LeadsReportDateBasis;
}

/** GET /leads/unassigned — same filters as list except no ownerId/priority on server. */
export interface GetUnassignedLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  temperature?: string;
  minScore?: number;
  maxScore?: number;
  source?: string;
  /**
   * `me` (default): unassigned leads where you appear in assignees.
   * `all`: all unassigned in org (admin or owner only).
   */
  scope?: 'me' | 'all';
}

export type LeadReassignStrategy = 'single' | 'round_robin' | 'least_loaded';

/** POST /leads/reassign */
export interface ReassignLeadsPayload {
  leadUids: number[];
  targetUserUids: number[];
  strategy?: LeadReassignStrategy;
  fromOwnerUid?: number;
  syncBranchToTarget?: boolean;
  reason?: string;
}

export interface ReassignLeadsResponse {
  reassigned: number;
  assignments: Array<{
    leadUid: number;
    newOwnerUid: number;
    newOwnerClerkUserId: string;
  }>;
  message: string;
}

/** Response from POST /leads/dedupe */
export interface LeadDedupeResponse {
  removed: number;
  message: string;
}

/** Response from POST /leads/import-csv (CSV or .xlsx upload) */
export interface LeadImportResponse {
  success: boolean;
  imported: number;
  failed: number;
  /** Rows skipped: lead already exists for org (same email and/or phone, non-deleted) */
  skippedDuplicates?: number;
  errors: Array<{ row: number; error: string }>;
  assignments?: Array<{ leadId: number; userId: number; userName: string }>;
  /** Per-user assignment counts for receipt UI */
  assignmentSummary?: Array<{
    userId: number;
    userName: string;
    leadsAssigned: number;
  }>;
  remindersCreated?: number;
  remindersFailed?: number;
  message?: string;
}

/** Filename for the downloadable CSV template (lead import). */
export const LEAD_IMPORT_SAMPLE_FILENAME = 'loro-leads-import-sample.csv';

/** Filename for the downloadable Excel template (all supported columns + example rows). */
export const LEAD_IMPORT_SAMPLE_XLSX_FILENAME = 'loro-leads-import-sample.xlsx';

/**
 * Sample CSV aligned with server csv-parser: at least one of name, email, or phone per row;
 * companyName optional. Source/Stage values work best as LeadSource / LeadLifecycleStage enums.
 */
export const LEAD_IMPORT_SAMPLE_CSV =
  'Created,Name,Email,Source,Form,Channel,Stage,Owner,Labels,Phone,Secondary phone number,WhatsApp number,companyName\n' +
  '2024-01-15T10:00:00.000Z,Jane Smith,jane@example.com,REFERRAL,Contact form,email,LEAD,,"VIP, Hot",+27123456789,+27119876543,+27830000001,"Acme Demo (Pty) Ltd"\n' +
  ',Bob Minimal,bob@example.com,,,,,,,27821234567,,,\n';

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
  /** Currency code (e.g. ZAR, USD). */
  currency?: string;
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
  form?: string;
  channel?: string;
  labels?: string[];
  secondaryPhoneNumber?: string;
  whatsAppNumber?: string;
}

/** Response from POST /leads (create). Server returns { message, data }. */
export interface CreateLeadResponse {
  message: string;
  data: LeadListItem | null;
}

/** Payload for PATCH /leads/:ref (update lead). Partial create payload plus optional status-change fields. */
export type UpdateLeadPayload = Partial<Omit<CreateLeadPayload, 'branch'>> & {
  statusChangeReason?: string;
  statusChangeDescription?: string;
  nextStep?: string;
};

/** Response from PATCH /leads/:ref, PATCH restore/reactivate, DELETE /leads/:ref */
export interface LeadActionResponse {
  message: string;
}

/** Params for GET /leads/:ref/engage-draft */
export interface EngageDraftParams {
  channel: 'email' | 'sms' | 'whatsapp';
  tone?: 'professional' | 'friendly' | 'formal';
  casualness?: 'casual' | 'neutral' | 'formal';
}

/** Response from GET /leads/:ref/engage-draft */
export interface EngageDraftResponse {
  draft: string;
  subject?: string;
}
