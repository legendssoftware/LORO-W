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

/** GET /shop/projects/me — projects for the authenticated linked client */
export async function getMyClientProjects(
  client: AxiosInstance
): Promise<ClientProject[]> {
  const { data } = await client.get<{ projects?: ClientProject[] }>(
    '/shop/projects/me'
  );
  return data?.projects ?? [];
}

/** GET /shop/projects/me/:id — single project with linked quotations */
export async function getMyClientProject(
  client: AxiosInstance,
  projectId: number
): Promise<ClientProject | null> {
  const { data } = await client.get<{ project?: ClientProject }>(
    `/shop/projects/me/${projectId}`
  );
  return data?.project ?? null;
}

/** POST /shop/projects/me — create project for the authenticated linked client */
export async function createClientProject(
  client: AxiosInstance,
  payload: CreateClientProjectPayload
): Promise<{ project?: ClientProject; message?: string }> {
  const { data } = await client.post<{ project?: ClientProject; message?: string }>(
    '/shop/projects/me',
    payload
  );
  return data;
}
