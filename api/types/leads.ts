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
  message?: string;
}

/** Filename for the downloadable CSV template (lead import). */
export const LEAD_IMPORT_SAMPLE_FILENAME = 'loro-leads-import-sample.csv';

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
