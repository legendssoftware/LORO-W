import type { AxiosInstance } from 'axios';
import type {
  ClaimDetailResponse,
  ClaimGroupsListResponse,
  ClaimsListResponse,
  ClaimsMeResponse,
  CreateClaimGroupPayload,
  CreateClaimPayload,
  CreateClaimResponse,
  MessageResponse,
  ShareTokenResponse,
  UpdateClaimGroupPayload,
  UpdateClaimPayload,
} from '@/api/types/claims';

export interface GetClaimsParams {
  page?: number;
  limit?: number;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  claimGroupUid?: number;
}

/**
 * GET /claims — paginated list (server applies RBAC / org scope).
 */
export async function getClaims(
  client: AxiosInstance,
  params: GetClaimsParams = {}
): Promise<ClaimsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.createdFrom) search.set('createdFrom', params.createdFrom);
  if (params.createdTo) search.set('createdTo', params.createdTo);
  if (params.claimGroupUid != null)
    search.set('claimGroupUid', String(params.claimGroupUid));
  const qs = search.toString();
  const { data } = await client.get<ClaimsListResponse>(
    `/claims${qs ? `?${qs}` : ''}`
  );
  return data;
}

/**
 * Normalizes GET /claims/me to ClaimsListResponse for shared list UI.
 */
export function normalizeClaimsMeResponse(
  raw: ClaimsMeResponse
): ClaimsListResponse {
  const claims = raw.claims ?? [];
  return {
    data: claims,
    message: raw.message,
    meta: {
      total: claims.length,
      page: 1,
      limit: claims.length,
      totalPages: 1,
    },
  };
}

export async function getClaimsMe(
  client: AxiosInstance
): Promise<ClaimsListResponse> {
  const { data } = await client.get<ClaimsMeResponse>('/claims/me');
  return normalizeClaimsMeResponse(data);
}

export async function getClaim(
  client: AxiosInstance,
  ref: number
): Promise<ClaimDetailResponse> {
  const { data } = await client.get<ClaimDetailResponse>(`/claims/${ref}`);
  return data;
}

export async function createClaim(
  client: AxiosInstance,
  body: CreateClaimPayload
): Promise<CreateClaimResponse> {
  const { data } = await client.post<CreateClaimResponse>('/claims', body);
  return data;
}

export async function updateClaim(
  client: AxiosInstance,
  ref: number,
  body: UpdateClaimPayload
): Promise<MessageResponse> {
  const { data } = await client.patch<MessageResponse>(
    `/claims/${ref}`,
    body
  );
  return data;
}

export async function deleteClaim(
  client: AxiosInstance,
  ref: number
): Promise<MessageResponse> {
  const { data } = await client.delete<MessageResponse>(`/claims/${ref}`);
  return data;
}

export async function generateShareToken(
  client: AxiosInstance,
  ref: number
): Promise<ShareTokenResponse> {
  const { data } = await client.post<ShareTokenResponse>(
    `/claims/${ref}/generate-share-token`,
    {}
  );
  return data;
}

export async function listClaimGroups(
  client: AxiosInstance
): Promise<ClaimGroupsListResponse> {
  const { data } = await client.get<ClaimGroupsListResponse>('/claims/groups');
  return data;
}

export async function createClaimGroup(
  client: AxiosInstance,
  body: CreateClaimGroupPayload
): Promise<ClaimGroupsListResponse & { group?: unknown }> {
  const { data } = await client.post<
    ClaimGroupsListResponse & { group?: unknown }
  >('/claims/groups', body);
  return data;
}

export async function updateClaimGroup(
  client: AxiosInstance,
  uid: number,
  body: UpdateClaimGroupPayload
): Promise<MessageResponse> {
  const { data } = await client.patch<MessageResponse>(
    `/claims/groups/${uid}`,
    body
  );
  return data;
}

export async function deleteClaimGroup(
  client: AxiosInstance,
  uid: number
): Promise<MessageResponse> {
  const { data } = await client.delete<MessageResponse>(
    `/claims/groups/${uid}`
  );
  return data;
}
