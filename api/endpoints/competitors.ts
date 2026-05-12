import type { AxiosInstance } from 'axios';
import type {
  CreateCompetitorPayload,
  CreateUpdateCompetitorResponse,
  GetCompetitorResponse,
  GetCompetitorsResponse,
  UpdateCompetitorPayload,
  CompetitorDeleteResponse,
} from '@/api/types/competitors';

export type {
  CompetitorListItem,
  CompetitorDetail,
  GetCompetitorsResponse,
  GetCompetitorResponse,
  CreateCompetitorPayload,
  UpdateCompetitorPayload,
} from '@/api/types/competitors';

export interface GetCompetitorsParams {
  page?: number;
  limit?: number;
  /** Partial name match (server query param `name`). */
  name?: string;
  status?: string;
  industry?: string;
  isDirect?: boolean;
  minThreatLevel?: number;
}

const DEFAULT_PAGE_SIZE = 100;

function appendCompetitorsSearchParams(
  search: URLSearchParams,
  params?: GetCompetitorsParams
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
  search.set('page', String(page));
  search.set('limit', String(limit));
  if (params?.name) search.set('name', params.name);
  if (params?.status) search.set('status', params.status);
  if (params?.industry) search.set('industry', params.industry);
  if (params?.isDirect === true) search.set('isDirect', 'true');
  if (params?.isDirect === false) search.set('isDirect', 'false');
  if (
    params?.minThreatLevel != null &&
    params.minThreatLevel >= 1 &&
    params.minThreatLevel <= 5
  ) {
    search.set('minThreatLevel', String(params.minThreatLevel));
  }
}

export async function getCompetitors(
  client: AxiosInstance,
  params?: GetCompetitorsParams
): Promise<GetCompetitorsResponse> {
  const search = new URLSearchParams();
  appendCompetitorsSearchParams(search, params);
  const qs = search.toString();
  const { data } = await client.get<GetCompetitorsResponse>(`/competitors${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getCompetitor(
  client: AxiosInstance,
  id: number
): Promise<GetCompetitorResponse> {
  const { data } = await client.get<GetCompetitorResponse>(`/competitors/${id}`);
  return data;
}

export async function createCompetitor(
  client: AxiosInstance,
  payload: CreateCompetitorPayload
): Promise<CreateUpdateCompetitorResponse> {
  const { data } = await client.post<CreateUpdateCompetitorResponse>('/competitors', payload);
  return data;
}

export async function updateCompetitor(
  client: AxiosInstance,
  id: number,
  payload: UpdateCompetitorPayload
): Promise<CreateUpdateCompetitorResponse> {
  const { data } = await client.patch<CreateUpdateCompetitorResponse>(
    `/competitors/${id}`,
    payload
  );
  return data;
}

export async function deleteCompetitor(
  client: AxiosInstance,
  id: number
): Promise<CompetitorDeleteResponse> {
  const { data } = await client.delete<CompetitorDeleteResponse>(`/competitors/${id}`);
  return data;
}
