import type { AxiosInstance } from 'axios';
import type {
  ConfirmOrganisationBannersBody,
  ConfirmOrganisationBannersResponse,
  CreateOrganisationBannerBody,
  GenerateOrganisationBannersBody,
  GenerateOrganisationBannersResponse,
  GetOrganisationBannersResponse,
  OrganisationBannerRecord,
  PatchOrganisationBannerBody,
  PreviewOrganisationBannersResponse,
  SetActiveOrganisationBannersBody,
  SetActiveOrganisationBannersResponse,
} from '@/api/types/organisation-banner';

export async function getOrganisationBanners(
  client: AxiosInstance,
  orgRef: string
): Promise<GetOrganisationBannersResponse> {
  const { data } = await client.get<GetOrganisationBannersResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/banners`
  );
  return data;
}

export async function postOrganisationBanner(
  client: AxiosInstance,
  orgRef: string,
  body: CreateOrganisationBannerBody
): Promise<{ banner: OrganisationBannerRecord; message: string }> {
  const { data } = await client.post<{ banner: OrganisationBannerRecord; message: string }>(
    `/organisations/${encodeURIComponent(orgRef)}/banners`,
    body
  );
  return data;
}

export async function patchActiveOrganisationBanners(
  client: AxiosInstance,
  orgRef: string,
  body: SetActiveOrganisationBannersBody
): Promise<SetActiveOrganisationBannersResponse> {
  const { data } = await client.patch<SetActiveOrganisationBannersResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/banners/active`,
    body
  );
  return data;
}

export async function postPreviewOrganisationBanners(
  client: AxiosInstance,
  orgRef: string,
  body: GenerateOrganisationBannersBody = {}
): Promise<PreviewOrganisationBannersResponse> {
  const { data } = await client.post<PreviewOrganisationBannersResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/banners/generate/preview`,
    body
  );
  return data;
}

export async function postConfirmOrganisationBanners(
  client: AxiosInstance,
  orgRef: string,
  body: ConfirmOrganisationBannersBody
): Promise<ConfirmOrganisationBannersResponse> {
  const { data } = await client.post<ConfirmOrganisationBannersResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/banners/generate/confirm`,
    body
  );
  return data;
}

export async function postGenerateOrganisationBanners(
  client: AxiosInstance,
  orgRef: string,
  body: GenerateOrganisationBannersBody = {}
): Promise<GenerateOrganisationBannersResponse> {
  const { data } = await client.post<GenerateOrganisationBannersResponse>(
    `/organisations/${encodeURIComponent(orgRef)}/banners/generate`,
    body
  );
  return data;
}

export async function patchOrganisationBanner(
  client: AxiosInstance,
  orgRef: string,
  uid: number,
  body: PatchOrganisationBannerBody
): Promise<{ banner: OrganisationBannerRecord; message: string }> {
  const { data } = await client.patch<{ banner: OrganisationBannerRecord; message: string }>(
    `/organisations/${encodeURIComponent(orgRef)}/banners/${uid}`,
    body
  );
  return data;
}

export async function deleteOrganisationBanner(
  client: AxiosInstance,
  orgRef: string,
  uid: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(
    `/organisations/${encodeURIComponent(orgRef)}/banners/${uid}`
  );
  return data;
}
