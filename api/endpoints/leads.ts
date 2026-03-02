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
} from '@/api/types/leads';
import type { DomainReportResponse } from '@/api/types/reports';

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
 * GET /leads/report - aggregated report (total, byStatus, byDay) for date range.
 */
export async function getLeadsReport(
  client: AxiosInstance,
  params: GetLeadsReportParams
): Promise<DomainReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  const { data } = await client.get<DomainReportResponse>(
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
  assignedUserIds: number[];
  followUpInterval?: string;
  followUpDuration?: number;
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
  search.set('assignedUserIds', params.assignedUserIds.join(','));
  if (params.followUpInterval) search.set('followUpInterval', params.followUpInterval);
  if (params.followUpDuration != null) search.set('followUpDuration', String(params.followUpDuration));
  const { data } = await client.post<LeadImportResponse>(
    `/leads/import-csv?${search.toString()}`,
    formData
  );
  return data;
}
