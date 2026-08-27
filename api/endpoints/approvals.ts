import type { AxiosInstance } from 'axios';
import type {
  Approval,
  ApprovalStatsResponse,
  ApprovalsListResponse,
} from '@/api/types/approvals';

export interface GetApprovalsParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function getApprovals(
  client: AxiosInstance,
  params: GetApprovalsParams = {}
): Promise<ApprovalsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.type) search.set('type', params.type);
  if (params.search) search.set('search', params.search);
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  const qs = search.toString();
  const { data } = await client.get<ApprovalsListResponse>(
    `/approvals${qs ? `?${qs}` : ''}`,
    { meta: { skipErrorToast: true } }
  );
  return data;
}

export async function getApproval(
  client: AxiosInstance,
  uid: number
): Promise<Approval> {
  const { data } = await client.get<Approval>(`/approvals/${uid}`, {
    meta: { skipErrorToast: true },
  });
  return data;
}

export async function getApprovalStats(
  client: AxiosInstance
): Promise<ApprovalStatsResponse> {
  const { data } = await client.get<ApprovalStatsResponse>('/approvals/stats', {
    meta: { skipErrorToast: true },
  });
  return data;
}

export async function performApprovalAction(
  client: AxiosInstance,
  uid: number,
  body: { action: 'approve' | 'reject'; comments?: string; reason?: string }
): Promise<unknown> {
  const { data } = await client.post(`/approvals/${uid}/action`, body);
  return data;
}
