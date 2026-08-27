import type { AxiosInstance } from 'axios';
import type {
  AcknowledgeOrganisationNoticeResponse,
  CreateOrganisationNoticeBody,
  GetActiveOrganisationNoticeResponse,
  GetOrganisationNoticesResponse,
  OrganisationNoticeRecord,
  PatchOrganisationNoticeBody,
} from '@/api/types/organisation-notice';

export async function getOrganisationNotices(
  client: AxiosInstance,
  orgRef: string
): Promise<GetOrganisationNoticesResponse> {
  const { data } = await client.get<GetOrganisationNoticesResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/notices`
  );
  return data;
}

export async function getActiveOrganisationNotice(
  client: AxiosInstance,
  orgRef: string
): Promise<GetActiveOrganisationNoticeResponse> {
  const { data } = await client.get<GetActiveOrganisationNoticeResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/notices/active`
  );
  return data;
}

export async function postOrganisationNotice(
  client: AxiosInstance,
  orgRef: string,
  body: CreateOrganisationNoticeBody
): Promise<{ notice: OrganisationNoticeRecord; message: string }> {
  const { data } = await client.post<{ notice: OrganisationNoticeRecord; message: string }>(
    `/organisations/${encodeURIComponent(orgRef)}/notices`,
    body
  );
  return data;
}

export async function patchOrganisationNotice(
  client: AxiosInstance,
  orgRef: string,
  uid: number,
  body: PatchOrganisationNoticeBody
): Promise<{ notice: OrganisationNoticeRecord; message: string }> {
  const { data } = await client.patch<{ notice: OrganisationNoticeRecord; message: string }>(
    `/organisations/${encodeURIComponent(orgRef)}/notices/${uid}`,
    body
  );
  return data;
}

export async function acknowledgeOrganisationNotice(
  client: AxiosInstance,
  orgRef: string,
  uid: number
): Promise<AcknowledgeOrganisationNoticeResponse> {
  const { data } = await client.post<AcknowledgeOrganisationNoticeResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/notices/${uid}/acknowledge`
  );
  return data;
}

export async function deleteOrganisationNotice(
  client: AxiosInstance,
  orgRef: string,
  uid: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(
    `/organisations/${encodeURIComponent(orgRef)}/notices/${uid}`
  );
  return data;
}
