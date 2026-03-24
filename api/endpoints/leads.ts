import type { AxiosInstance } from 'axios';
import type {
  LeadsListResponse,
  LeadsForUserResponse,
  LeadDetailResponse,
  GetLeadsParams,
  GetLeadsReportParams,
  LeadImportResponse,
  CreateLeadPayload,
  CreateLeadResponse,
  UpdateLeadPayload,
  LeadActionResponse,
  EngageDraftParams,
  EngageDraftResponse,
} from '@/api/types/leads';
import type { LeadsReportResponse } from '@/api/types/reports';

/**
 * GET /leads - paginated list of leads.
 * Admin/owner: all leads. User: own leads only (owner or assignee).
 */
export async function getLeads(
  client: AxiosInstance,
  params: GetLeadsParams = {}
): Promise<LeadsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.search) search.set('search', params.search);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.temperature) search.set('temperature', params.temperature);
  if (params.minScore != null) search.set('minScore', String(params.minScore));
  if (params.maxScore != null) search.set('maxScore', String(params.maxScore));
  if (params.priority) search.set('priority', params.priority);
  if (params.source) search.set('source', params.source);
  if (params.ownerId != null) search.set('ownerId', String(params.ownerId));
  if (params.branchId != null) search.set('branchId', String(params.branchId));
  const qs = search.toString();
  const { data } = await client.get<LeadsListResponse>(`/leads${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /leads/for - leads for the authenticated user (owner or assignee) with stats.
 */
export async function getLeadsForUser(
  client: AxiosInstance
): Promise<LeadsForUserResponse> {
  const { data } = await client.get<LeadsForUserResponse>('/leads/for');
  return data;
}

/**
 * GET /leads/report - aggregated report (counts, pipeline, breakdowns) for date range.
 */
export async function getLeadsReport(
  client: AxiosInstance,
  params: GetLeadsReportParams
): Promise<LeadsReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  if (params.branchId != null) search.set('branchId', String(params.branchId));
  if (params.ownerId != null) search.set('ownerId', String(params.ownerId));
  if (params.status) search.set('status', params.status);
  if (params.source) search.set('source', params.source);
  if (params.search) search.set('search', params.search);
  const { data } = await client.get<LeadsReportResponse>(
    `/leads/report?${search.toString()}`
  );
  return data;
}

/**
 * GET /leads/:ref - single lead by ID.
 */
export async function getLead(
  client: AxiosInstance,
  ref: number
): Promise<LeadDetailResponse> {
  const { data } = await client.get<LeadDetailResponse>(`/leads/${ref}`);
  return data;
}

/**
 * POST /leads - create a new lead.
 */
export async function createLead(
  client: AxiosInstance,
  payload: CreateLeadPayload
): Promise<CreateLeadResponse> {
  const { data } = await client.post<CreateLeadResponse>('/leads', payload);
  return data;
}

export interface ImportLeadsFromCSVParams {
  assignedUserIds?: number[];
  /**
   * Branch UID: when assigning by branch (no assignedUserIds), round-robin among users
   * in this branch; leads are filed under this branch. When `assignedUserIds` is set,
   * optional filing branch for elevated roles (server enforces access).
   */
  targetBranchId?: number;
  followUpInterval?: string;
  followUpDuration?: number;
  /** Default lead source (e.g. WEBSITE, REFERRAL) when CSV does not provide Source. */
  source?: string;
}

/**
 * PATCH /leads/:ref - update a lead.
 */
export async function updateLead(
  client: AxiosInstance,
  ref: number,
  payload: UpdateLeadPayload
): Promise<LeadActionResponse> {
  const { data } = await client.patch<LeadActionResponse>(`/leads/${ref}`, payload);
  return data;
}

/**
 * DELETE /leads/:ref - soft-delete a lead.
 */
export async function deleteLead(
  client: AxiosInstance,
  ref: number
): Promise<LeadActionResponse> {
  const { data } = await client.delete<LeadActionResponse>(`/leads/${ref}`);
  return data;
}

/**
 * PATCH /leads/:ref/restore - restore a soft-deleted lead.
 */
export async function restoreLead(
  client: AxiosInstance,
  ref: number
): Promise<LeadActionResponse> {
  const { data } = await client.patch<LeadActionResponse>(`/leads/${ref}/restore`);
  return data;
}

/**
 * PATCH /leads/:ref/reactivate - reactivate a declined or cancelled lead.
 */
export async function reactivateLead(
  client: AxiosInstance,
  ref: number
): Promise<LeadActionResponse> {
  const { data } = await client.patch<LeadActionResponse>(`/leads/${ref}/reactivate`);
  return data;
}

/**
 * GET /leads/engage-draft/:ref - AI-generated follow-up draft for the lead (Gemini RAG).
 */
export async function getEngageDraft(
  client: AxiosInstance,
  leadRef: number,
  params: EngageDraftParams
): Promise<EngageDraftResponse> {
  const search = new URLSearchParams({ channel: params.channel });
  if (params.tone) search.set('tone', params.tone);
  if (params.casualness) search.set('casualness', params.casualness);
  const { data } = await client.get<EngageDraftResponse>(
    `/leads/engage-draft/${leadRef}?${search.toString()}`
  );
  return data;
}

/**
 * POST /leads/:ref/send-engage - send message to lead via email, sms, or whatsapp (server-handled).
 */
export async function sendLeadEngage(
  client: AxiosInstance,
  ref: number,
  payload: { channel: 'email' | 'sms' | 'whatsapp'; message: string }
): Promise<LeadActionResponse> {
  const { data } = await client.post<LeadActionResponse>(`/leads/${ref}/send-engage`, payload);
  return data;
}

/**
 * POST /leads/import-csv - import leads from CSV file, optionally assigning to specific users.
 */
export async function importLeadsFromCSV(
  client: AxiosInstance,
  formData: FormData,
  params: ImportLeadsFromCSVParams
): Promise<LeadImportResponse> {
  const search = new URLSearchParams();
  if (params.assignedUserIds?.length) {
    search.set('assignedUserIds', params.assignedUserIds.join(','));
  }
  if (params.targetBranchId != null) {
    search.set('targetBranchId', String(params.targetBranchId));
  }
  if (params.followUpInterval) search.set('followUpInterval', params.followUpInterval);
  if (params.followUpDuration != null) search.set('followUpDuration', String(params.followUpDuration));
  if (params.source?.trim()) search.set('source', params.source.trim());
  const { data } = await client.post<LeadImportResponse>(
    `/leads/import-csv?${search.toString()}`,
    formData
  );
  return data;
}
