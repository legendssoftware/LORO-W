import type { AxiosInstance } from 'axios';
import type {
  CreateCompetitorPayload,
  CreateUpdateCompetitorResponse,
  GetCompetitorResponse,
  GetCompetitorsResponse,
  UpdateCompetitorPayload,
  CompetitorDeleteResponse,
  CompetitorImportResponse,
  CompetitorListItem,
  BulkUpdateCompetitorsPayload,
  BulkUpdateCompetitorsResponse,
} from '@/api/types/competitors';

export type {
  CompetitorListItem,
  CompetitorDetail,
  GetCompetitorsResponse,
  GetCompetitorResponse,
  CreateCompetitorPayload,
  UpdateCompetitorPayload,
  BulkUpdateCompetitorsPayload,
  BulkUpdateCompetitorsResponse,
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

/** Lightweight competitor row from GET /competitors/map-data (coords required). */
export interface CompetitorMapMarker {
  id: number;
  name: string;
  position: [number, number];
  markerType: 'competitor';
  threatLevel?: number;
  isDirect?: boolean;
  industry?: string;
  status?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  competitorRef?: string | null;
  address?: CompetitorListItem['address'];
  contactPhone?: string | null;
  contactEmail?: string | null;
  estimatedAnnualRevenue?: number | null;
  accountName?: string | null;
  LegalEntity?: string | null;
  TradingName?: string | null;
  latitude?: number;
  longitude?: number;
}

/**
 * GET /competitors/map-data — up to 1000 geocoded competitors for the visualiser.
 */
export async function getCompetitorsMapData(
  client: AxiosInstance
): Promise<CompetitorMapMarker[]> {
  const { data } = await client.get<CompetitorMapMarker[] | { data?: CompetitorMapMarker[] }>(
    '/competitors/map-data'
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
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

const BULK_UPDATE_CHUNK = 50;

/**
 * PATCH /competitors/bulk — update many competitors (max 50 per request).
 * Chunks automatically when `updates.length` exceeds the server limit.
 */
export async function bulkUpdateCompetitors(
  client: AxiosInstance,
  payload: BulkUpdateCompetitorsPayload
): Promise<BulkUpdateCompetitorsResponse> {
  const updates = payload.updates ?? [];
  if (updates.length === 0) {
    return { success: true, successCount: 0, failureCount: 0, results: [] };
  }

  const allResults: NonNullable<BulkUpdateCompetitorsResponse['results']> = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < updates.length; i += BULK_UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + BULK_UPDATE_CHUNK);
    const { data } = await client.patch<BulkUpdateCompetitorsResponse>(
      '/competitors/bulk',
      { updates: chunk }
    );
    const results = data.results ?? [];
    allResults.push(...results);
    successCount +=
      data.successCount ?? results.filter((r) => r.success).length;
    failureCount +=
      data.failureCount ?? results.filter((r) => !r.success).length;
  }

  return {
    success: failureCount === 0,
    successCount,
    failureCount,
    results: allResults,
  };
}

export async function deleteCompetitor(
  client: AxiosInstance,
  id: number
): Promise<CompetitorDeleteResponse> {
  const { data } = await client.delete<CompetitorDeleteResponse>(`/competitors/${id}`);
  return data;
}

const IMPORT_CSV_LONG_TIMEOUT_MS = 10 * 60 * 1000;

export type ImportCompetitorsFromCSVOptions = {
  longRunning?: boolean;
  branchId?: number;
};

export async function importCompetitorsFromCSV(
  client: AxiosInstance,
  formData: FormData,
  options?: ImportCompetitorsFromCSVOptions
): Promise<CompetitorImportResponse> {
  const search = new URLSearchParams();
  if (options?.branchId != null) {
    search.set('branchId', String(options.branchId));
  }
  const qs = search.toString();
  const axiosConfig =
    options?.longRunning === true ? { timeout: IMPORT_CSV_LONG_TIMEOUT_MS } : undefined;
  const { data } = await client.post<CompetitorImportResponse>(
    `/competitors/import-csv${qs ? `?${qs}` : ''}`,
    formData,
    axiosConfig
  );
  return data;
}
