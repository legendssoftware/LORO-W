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
  userRef: string | number
): Promise<UserWarningsResponse> {
  const { data } = await client.get<UserWarningsResponse>(
    `/warnings/user/${userRef}`
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

/** Normalize list payloads whether nested or flat. */
export function normalizeWarningsList(
  res: UserWarningsResponse | { data?: { warnings?: WarningRecord[] }; warnings?: WarningRecord[] }
): WarningRecord[] {
  if (Array.isArray(res.warnings)) return res.warnings;
  const nested = (res as { data?: { warnings?: WarningRecord[] } }).data?.warnings;
  if (Array.isArray(nested)) return nested;
  return [];
}
