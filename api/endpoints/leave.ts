import type { AxiosInstance } from 'axios';
import type {
  CreateLeavePayload,
  LeaveListFilters,
  LeaveListResult,
  LeaveRecord,
  LeaveReport,
  LeavesByUserResponse,
} from '@/api/types/leave';
import type { LeaveListResponse } from '@/api/types/reports';

export interface GetLeaveListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

/**
 * GET /leave - list leave requests with date range and filters (for reports).
 */
export async function getLeaveList(
  client: AxiosInstance,
  params: GetLeaveListParams = {}
): Promise<LeaveListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  const { data } = await client.get<LeaveListResponse>(`/leave${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /leave/user/:ref - employee leave history (requires clerkUserId).
 * Returns leaves for the authenticated user's organization context.
 */

/** GET /leave — organisation inbox. */
export async function getLeaveInbox(
  client: AxiosInstance,
  params: LeaveListFilters = {},
  opts?: { signal?: AbortSignal }
): Promise<LeaveListResult> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.status) search.set('status', params.status);
  if (params.leaveType) search.set('leaveType', params.leaveType);
  if (params.ownerUid != null) search.set('ownerUid', String(params.ownerUid));
  const qs = search.toString();
  const { data } = await client.get<LeaveListResult>(`/leave${qs ? `?${qs}` : ''}`, {
    signal: opts?.signal,
  });
  return {
    ...data,
    data: Array.isArray(data.data) ? data.data : [],
  };
}

/** GET /leave/report */
export async function getLeaveReport(
  client: AxiosInstance,
  from: string,
  to: string,
  opts?: { signal?: AbortSignal }
): Promise<LeaveReport> {
  const { data } = await client.get<LeaveReport>('/leave/report', {
    params: { from, to },
    signal: opts?.signal,
  });
  return data;
}

/** GET /leave/:ref */
export async function getLeave(
  client: AxiosInstance,
  ref: number
): Promise<LeaveRecord> {
  const { data } = await client.get<LeaveRecord | { leave?: LeaveRecord; data?: LeaveRecord }>(
    `/leave/${ref}`
  );
  if (data && typeof data === 'object' && 'leaveType' in data) return data as LeaveRecord;
  const wrapped = data as { leave?: LeaveRecord; data?: LeaveRecord };
  return (wrapped.leave ?? wrapped.data) as LeaveRecord;
}

/** POST /leave */
export async function createLeave(
  client: AxiosInstance,
  payload: CreateLeavePayload
): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/leave', payload);
  return data;
}

/** PATCH /leave/:ref/approve */
export async function approveLeave(client: AxiosInstance, ref: number): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/leave/${ref}/approve`);
  return data;
}

/** PATCH /leave/:ref/reject */
export async function rejectLeave(
  client: AxiosInstance,
  ref: number,
  rejectionReason: string
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/leave/${ref}/reject`, {
    rejectionReason,
  });
  return data;
}

/** PATCH /leave/:ref/cancel */
export async function cancelLeave(
  client: AxiosInstance,
  ref: number,
  cancellationReason: string
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/leave/${ref}/cancel`, {
    cancellationReason,
  });
  return data;
}

/** DELETE /leave/:ref */
export async function deleteLeave(client: AxiosInstance, ref: number): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(`/leave/${ref}`);
  return data;
}

export async function getLeavesByUser(
  client: AxiosInstance,
  clerkUserId: string,
  opts?: { signal?: AbortSignal }
): Promise<LeavesByUserResponse> {
  const { data } = await client.get<LeavesByUserResponse>(`/leave/user/${clerkUserId}`, {
    signal: opts?.signal,
  });
  return data;
}
