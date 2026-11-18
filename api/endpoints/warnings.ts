import type { AxiosInstance } from 'axios';
import type {
  CreateWarningPayload,
  UpdateWarningPayload,
  UserWarningsResponse,
  WarningDetailResponse,
  WarningMutationResponse,
  WarningRecord,
  WarningsListResponse,
} from '@/api/types/warnings';

const silent = { meta: { skipErrorToast: true } } as const;

export interface GetWarningsParams {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
}

/** GET /warnings — organisation list. Status and severity are applied on the server. */
export async function getWarnings(
  client: AxiosInstance,
  params: GetWarningsParams = {}
): Promise<WarningsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.severity) search.set('severity', params.severity);
  const qs = search.toString();
  const { data } = await client.get<WarningsListResponse>(`/warnings${qs ? `?${qs}` : ''}`, silent);
  return data;
}

/** GET /warnings/:ref — one warning. `ref` is the numeric uid. */
export async function getWarning(
  client: AxiosInstance,
  warningUid: number
): Promise<WarningDetailResponse> {
  const { data } = await client.get<WarningDetailResponse>(`/warnings/${warningUid}`, silent);
  return data;
}

/**
 * GET /warnings/user/:ref — warnings for a user (uid or clerkUserId).
 * Enterprise-only; callers should handle 403.
 */
export async function getUserWarnings(
  client: AxiosInstance,
  userRef: string | number
): Promise<UserWarningsResponse> {
  const { data } = await client.get<UserWarningsResponse>(`/warnings/user/${userRef}`, silent);
  return data;
}

/**
 * POST /warnings — issue a formal warning (recipientClerkId + issuer from JWT).
 */
export async function createWarning(
  client: AxiosInstance,
  payload: CreateWarningPayload
): Promise<WarningMutationResponse> {
  const { data } = await client.post<WarningMutationResponse>(
    '/warnings',
    payload
  );
  if (!data.warning) {
    throw new Error(data.message || 'Failed to create warning');
  }
  return data;
}

/**
 * PATCH /warnings/:ref — update or revoke a warning.
 */
export async function updateWarning(
  client: AxiosInstance,
  warningUid: number,
  payload: UpdateWarningPayload
): Promise<WarningMutationResponse> {
  const { data } = await client.patch<WarningMutationResponse>(
    `/warnings/${warningUid}`,
    payload
  );
  if (!data.warning) {
    throw new Error(data.message || 'Failed to update warning');
  }
  return data;
}

/**
 * DELETE /warnings/:ref — HR, admin, manager, and owner.
 */
export async function deleteWarning(
  client: AxiosInstance,
  warningUid: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(
    `/warnings/${warningUid}`
  );
  return data;
}

/** Rows from GET /warnings or GET /warnings/user/:ref, either shape. */
export function normalizeWarningsList(
  res: UserWarningsResponse | WarningsListResponse | { data?: WarningRecord[] | { warnings?: WarningRecord[] }; warnings?: WarningRecord[] }
): WarningRecord[] {
  if (Array.isArray(res.warnings)) return res.warnings;
  if (Array.isArray(res.data)) return res.data;
  const nested = res.data?.warnings;
  if (Array.isArray(nested)) return nested;
  return [];
}
