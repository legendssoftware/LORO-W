import type { AxiosInstance } from 'axios';
import type {
  CreateLeavePayload,
  LeaveDetailResponse,
  LeaveListResponse,
  LeaveMutationResponse,
  LeaveReportResponse,
  LeavesByUserResponse,
  UpdateLeavePayload,
} from '@/api/types/leave';

const silent = { meta: { skipErrorToast: true } } as const;

export interface GetLeaveListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  leaveType?: string;
  /**
   * Clerk user id or numeric user uid.
   * The list query does not apply this on the server. Filter by person with GET /leave/user/:ref.
   */
  ownerUid?: string;
}

/** GET /leave — paginated requests. The server limits rows to the caller's scope. */
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
  if (params.leaveType) search.set('leaveType', params.leaveType);
  if (params.ownerUid) search.set('ownerUid', params.ownerUid);
  const qs = search.toString();
  const { data } = await client.get<LeaveListResponse>(`/leave${qs ? `?${qs}` : ''}`, silent);
  return data;
}

/** GET /leave/report — counts by status and day. Dates are YYYY-MM-DD. */
export async function getLeaveReport(
  client: AxiosInstance,
  params: { from: string; to: string }
): Promise<LeaveReportResponse> {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  const { data } = await client.get<LeaveReportResponse>(`/leave/report?${search.toString()}`, silent);
  return data;
}

/** GET /leave/:ref — one request. `ref` is the numeric uid. */
export async function getLeave(
  client: AxiosInstance,
  ref: number
): Promise<LeaveDetailResponse> {
  const { data } = await client.get<LeaveDetailResponse>(`/leave/${ref}`, silent);
  return data;
}

/**
 * GET /leave/user/:ref — one person's history.
 * `ref` is a Clerk user id or a numeric user uid.
 */
export async function getLeavesByUser(
  client: AxiosInstance,
  ref: string
): Promise<LeavesByUserResponse> {
  const { data } = await client.get<LeavesByUserResponse>(
    `/leave/user/${encodeURIComponent(ref)}`,
    silent
  );
  return data;
}

/** POST /leave — pending request for the signed-in user. */
export async function createLeave(
  client: AxiosInstance,
  body: CreateLeavePayload
): Promise<LeaveMutationResponse> {
  const { data } = await client.post<LeaveMutationResponse>('/leave', body, silent);
  return data;
}

/** PATCH /leave/:ref — update a pending request. */
export async function updateLeave(
  client: AxiosInstance,
  ref: number,
  body: UpdateLeavePayload
): Promise<LeaveMutationResponse> {
  const { data } = await client.patch<LeaveMutationResponse>(`/leave/${ref}`, body, silent);
  return data;
}

/** PATCH /leave/:ref/approve — admin, manager, owner, or HR. */
export async function approveLeave(
  client: AxiosInstance,
  ref: number
): Promise<LeaveMutationResponse> {
  const { data } = await client.patch<LeaveMutationResponse>(`/leave/${ref}/approve`, undefined, silent);
  return data;
}

/** PATCH /leave/:ref/reject — the server requires rejectionReason. */
export async function rejectLeave(
  client: AxiosInstance,
  ref: number,
  rejectionReason: string
): Promise<LeaveMutationResponse> {
  const { data } = await client.patch<LeaveMutationResponse>(
    `/leave/${ref}/reject`,
    { rejectionReason },
    silent
  );
  return data;
}

/** PATCH /leave/:ref/cancel — the server requires cancellationReason. */
export async function cancelLeave(
  client: AxiosInstance,
  ref: number,
  cancellationReason: string
): Promise<LeaveMutationResponse> {
  const { data } = await client.patch<LeaveMutationResponse>(
    `/leave/${ref}/cancel`,
    { cancellationReason },
    silent
  );
  return data;
}

/** DELETE /leave/:ref — soft delete for admin, manager, owner, or HR. */
export async function deleteLeave(
  client: AxiosInstance,
  ref: number
): Promise<LeaveMutationResponse> {
  const { data } = await client.delete<LeaveMutationResponse>(`/leave/${ref}`, silent);
  return data;
}
