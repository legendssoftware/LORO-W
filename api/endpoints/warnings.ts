import type { AxiosInstance } from 'axios';
import type {
  CreateWarningPayload,
  UpdateWarningPayload,
  UserWarningsResponse,
  WarningMutationResponse,
  WarningRecord,
} from '@/api/types/warnings';

/**
 * GET /warnings/user/:ref — warnings for a user (uid or clerkUserId).
 * Enterprise-only; callers should handle 403.
 */
export async function getUserWarnings(
  client: AxiosInstance,
  userRef: string | number,
  opts?: { signal?: AbortSignal }
): Promise<UserWarningsResponse> {
  const { data } = await client.get<UserWarningsResponse>(
    `/warnings/user/${userRef}`,
    { signal: opts?.signal }
  );
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
 * DELETE /warnings/:ref — hard delete (ADMIN / OWNER only).
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

export interface GetWarningsParams {
  status?: string;
  severity?: string;
  ownerId?: number;
  page?: number;
  limit?: number;
}

/** GET /warnings — organisation inbox. */
export async function getWarnings(
  client: AxiosInstance,
  params: GetWarningsParams = {},
  opts?: { signal?: AbortSignal }
): Promise<{ warnings: WarningRecord[]; message?: string }> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.severity) search.set('severity', params.severity);
  if (params.ownerId != null) search.set('ownerId', String(params.ownerId));
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  const { data } = await client.get<
    | WarningRecord[]
    | { warnings?: WarningRecord[]; data?: WarningRecord[] | { warnings?: WarningRecord[] } }
  >(`/warnings${qs ? `?${qs}` : ''}`, { signal: opts?.signal });
  return { warnings: normalizeWarningsList(data as UserWarningsResponse) };
}

/** Normalize list payloads whether nested or flat. */
export function normalizeWarningsList(
  res: UserWarningsResponse | { data?: { warnings?: WarningRecord[] }; warnings?: WarningRecord[] }
): WarningRecord[] {
  if (Array.isArray(res.warnings)) return res.warnings;
  const nested = (res as { data?: { warnings?: WarningRecord[] } }).data?.warnings;
  if (Array.isArray(nested)) return nested;
  return [];
}
