import type { AxiosInstance, AxiosError } from 'axios';
import type {
  GetOrganisationResponse,
  OrganisationAppearanceRecord,
  PatchOrganisationAppearanceBody,
  GetOrganisationSettingsResponse,
  PatchOrganisationSettingsBody,
  OrganisationHoursRecord,
  PatchOrganisationHoursBody,
  PatchOrganisationProfileBody,
} from '@/api/types/organisation';

function isNotFound(err: unknown): boolean {
  return (
    err != null &&
    typeof err === 'object' &&
    'response' in err &&
    (err as AxiosError).response?.status === 404
  );
}

export async function getOrganisation(
  client: AxiosInstance,
  ref: string
): Promise<GetOrganisationResponse> {
  const { data } = await client.get<GetOrganisationResponse>(`/org/${encodeURIComponent(ref)}`);
  return data;
}

export async function patchOrganisation(
  client: AxiosInstance,
  ref: string,
  body: PatchOrganisationProfileBody
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/org/${encodeURIComponent(ref)}`,
    body
  );
  return data;
}

export async function getOrganisationAppearance(
  client: AxiosInstance,
  orgRef: string
): Promise<OrganisationAppearanceRecord | null> {
  try {
    const { data } = await client.get<OrganisationAppearanceRecord>(
      `/organisations/${encodeURIComponent(orgRef)}/appearance`
    );
    return data;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export async function patchOrganisationAppearance(
  client: AxiosInstance,
  orgRef: string,
  body: PatchOrganisationAppearanceBody
): Promise<OrganisationAppearanceRecord> {
  const { data } = await client.patch<OrganisationAppearanceRecord>(
    `/organisations/${encodeURIComponent(orgRef)}/appearance`,
    body
  );
  return data;
}

export async function postOrganisationAppearance(
  client: AxiosInstance,
  orgRef: string,
  body: PatchOrganisationAppearanceBody
): Promise<OrganisationAppearanceRecord> {
  const { data } = await client.post<OrganisationAppearanceRecord>(
    `/organisations/${encodeURIComponent(orgRef)}/appearance`,
    body
  );
  return data;
}

export async function getOrganisationSettings(
  client: AxiosInstance,
  orgRef: string
): Promise<GetOrganisationSettingsResponse> {
  const { data } = await client.get<GetOrganisationSettingsResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/settings`
  );
  return data;
}

export async function patchOrganisationSettings(
  client: AxiosInstance,
  orgRef: string,
  body: PatchOrganisationSettingsBody
): Promise<GetOrganisationSettingsResponse> {
  const { data } = await client.patch<GetOrganisationSettingsResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/settings`,
    body
  );
  return data;
}

export async function postOrganisationSettings(
  client: AxiosInstance,
  orgRef: string,
  body: PatchOrganisationSettingsBody
): Promise<GetOrganisationSettingsResponse> {
  const { data } = await client.post<GetOrganisationSettingsResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/settings`,
    body
  );
  return data;
}

export async function getOrganisationHoursDefault(
  client: AxiosInstance,
  orgRef: string
): Promise<OrganisationHoursRecord | null> {
  const { data } = await client.get<OrganisationHoursRecord | null>(
    `/organisations/${encodeURIComponent(orgRef)}/hours`
  );
  return data ?? null;
}

export async function patchOrganisationHoursDefault(
  client: AxiosInstance,
  orgRef: string,
  body: PatchOrganisationHoursBody
): Promise<OrganisationHoursRecord> {
  const { data } = await client.patch<OrganisationHoursRecord>(
    `/organisations/${encodeURIComponent(orgRef)}/hours`,
    body
  );
  return data;
}
