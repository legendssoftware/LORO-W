import type { AxiosInstance } from 'axios';
import type { LeavesByUserResponse } from '@/api/types/leave';
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
export async function getLeavesByUser(
  client: AxiosInstance,
  clerkUserId: string
): Promise<LeavesByUserResponse> {
  const { data } = await client.get<LeavesByUserResponse>(`/leave/user/${clerkUserId}`);
  return data;
}
