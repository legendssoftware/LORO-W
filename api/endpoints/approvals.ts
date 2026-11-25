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
  params: GetApprovalsParams = {},
  opts?: { signal?: AbortSignal }
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
    { meta: { skipErrorToast: true }, signal: opts?.signal }
  );
  return data;
}

export async function getApproval(
  client: AxiosInstance,
  uid: number,
  opts?: { signal?: AbortSignal }
): Promise<Approval> {
  const { data } = await client.get<Approval>(`/approvals/${uid}`, {
    meta: { skipErrorToast: true },
    signal: opts?.signal,
  });
  return data;
}

export async function getApprovalStats(
  client: AxiosInstance,
  opts?: { signal?: AbortSignal }
): Promise<ApprovalStatsResponse> {
  const { data } = await client.get<ApprovalStatsResponse>('/approvals/stats', {
    meta: { skipErrorToast: true },
    signal: opts?.signal,
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

export async function createApproval(client: AxiosInstance, body: { title: string; type: string }): Promise<unknown> {
  const { data } = await client.post('/approvals', body);
  return data;
}

export async function submitApproval(client: AxiosInstance, id: number): Promise<unknown> {
  const { data } = await client.post(`/approvals/${id}/submit`);
  return data;
}

export async function signApproval(client: AxiosInstance, id: number): Promise<unknown> {
  const { data } = await client.post(`/approvals/${id}/sign`, { signatureType: 'DRAWN', signatureUrl: 'web-sign' });
  return data;
}

export async function withdrawApproval(client: AxiosInstance, id: number): Promise<unknown> {
  const { data } = await client.post(`/approvals/${id}/withdraw`);
  return data;
}

export async function archiveApproval(client: AxiosInstance, id: number): Promise<unknown> {
  const { data } = await client.post(`/approvals/${id}/archive`);
  return data;
}

export async function getApprovalHistory(client: AxiosInstance, id: number): Promise<unknown> {
  const { data } = await client.get(`/approvals/${id}/history`);
  return data;
}

export async function getApprovalSignatures(client: AxiosInstance, id: number): Promise<unknown> {
  const { data } = await client.get(`/approvals/${id}/signatures`);
  return data;
}

export async function bulkApprovalAction(
  client: AxiosInstance,
  approvalUids: number[],
  action: string
): Promise<unknown> {
  const { data } = await client.post('/approvals/bulk-action', { approvalUids, action });
  return data;
}

export async function getMyApprovalRequests(client: AxiosInstance): Promise<unknown> {
  const { data } = await client.get('/approvals/my-requests');
  return data;
}
