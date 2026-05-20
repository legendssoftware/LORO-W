import type { AxiosInstance } from 'axios';
import type {
  ClientProfileData,
  CreateClientProjectPayload,
  CreditLimitExtensionPayload,
  GetLinkedClientMeResponse,
  PatchClientProfileResponse,
  UpdateClientProfilePayload,
  ClientProject,
} from '@/api/types/client-portal';

export type {
  ClientProfileData,
  ClientQuotation,
  ClientProject,
  UpdateClientProfilePayload,
} from '@/api/types/client-portal';

/** GET /clients/me — full linked client profile (client portal). */
export async function getLinkedClientMe(
  client: AxiosInstance
): Promise<ClientProfileData | null> {
  const { data } = await client.get<GetLinkedClientMeResponse>('/clients/me');
  const profile = data?.client ?? null;
  if (!profile) return null;
  return { ...profile, accessLevel: 'client' as const };
}

/** PATCH /clients/profile — update own client profile. */
export async function patchClientProfile(
  client: AxiosInstance,
  payload: UpdateClientProfilePayload
): Promise<PatchClientProfileResponse> {
  const { data } = await client.patch<PatchClientProfileResponse>(
    '/clients/profile',
    payload
  );
  return data;
}

/** POST /clients/profile/credit-limit-extension */
export async function postCreditLimitExtension(
  client: AxiosInstance,
  payload: CreditLimitExtensionPayload
): Promise<{ message?: string }> {
  const { data } = await client.post<{ message?: string }>(
    '/clients/profile/credit-limit-extension',
    payload
  );
  return data;
}

/** GET /projects/client/:clientId */
export async function getClientProjects(
  client: AxiosInstance,
  clientId: number
): Promise<ClientProject[]> {
  const { data } = await client.get<{ projects?: ClientProject[] }>(
    `/projects/client/${clientId}`
  );
  return data?.projects ?? [];
}

/** POST /projects — create project for linked client */
export async function createClientProject(
  client: AxiosInstance,
  payload: CreateClientProjectPayload & { clientUid?: number }
): Promise<{ project?: ClientProject; message?: string }> {
  const { data } = await client.post<{ project?: ClientProject; message?: string }>(
    '/projects',
    payload
  );
  return data;
}
