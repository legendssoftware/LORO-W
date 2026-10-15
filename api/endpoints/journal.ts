import type { AxiosInstance } from 'axios';
import type {
  CreateJournalPayload,
  Journal,
  JournalDetailResponse,
  JournalListResponse,
  JournalMessageResponse,
  JournalStatus,
  UpdateJournalPayload,
} from '@/api/types/journal';

export interface GetJournalsParams {
  page?: number;
  limit?: number;
  status?: JournalStatus | string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface JournalsByUserResponse {
  journals?: Journal[] | null;
  data?: Journal[] | null;
  message?: string;
  stats?: { total?: number } | null;
  meta?: JournalListResponse['meta'];
}

/**
 * Treats the journal service's `{ message }` body as a failure when it is not "success".
 * The service often returns HTTP 200 with an error string.
 */
export function assertJournalMessage(message: string | undefined, fallback: string): void {
  const normalized = (message ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'success') return;
  throw new Error(message?.trim() || fallback);
}

function normalizeList(
  raw: JournalsByUserResponse,
  fallbackLimit: number
): JournalListResponse {
  const journals = raw.journals ?? raw.data ?? [];
  const total = raw.meta?.total ?? raw.stats?.total ?? journals.length;
  return {
    data: journals,
    message: raw.message,
    meta: raw.meta ?? {
      total,
      page: 1,
      limit: fallbackLimit || journals.length || 1,
      totalPages: 1,
    },
  };
}

/**
 * GET /journal — paginated org list. Server scopes by organisation and branch.
 */
export async function getJournals(
  client: AxiosInstance,
  params: GetJournalsParams = {}
): Promise<JournalListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.search) search.set('search', params.search);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  const qs = search.toString();
  const { data } = await client.get<JournalsByUserResponse>(
    `/journal${qs ? `?${qs}` : ''}`
  );
  const list = normalizeList(data, params.limit ?? 25);
  assertJournalMessage(list.message, 'Could not load merchandise');
  return list;
}

/**
 * GET /journal/for/:ref — every log owned by that user.
 */
export async function getJournalsForUser(
  client: AxiosInstance,
  userUid: number
): Promise<JournalListResponse> {
  const { data } = await client.get<JournalsByUserResponse>(`/journal/for/${userUid}`);
  const list = normalizeList(data, data.journals?.length ?? data.data?.length ?? 0);
  assertJournalMessage(list.message, 'Could not load merchandise');
  return list;
}

/**
 * GET /journal/:ref — `{ journal, message }`.
 */
export async function getJournal(
  client: AxiosInstance,
  ref: number
): Promise<JournalDetailResponse> {
  const { data } = await client.get<JournalDetailResponse>(`/journal/${ref}`);
  assertJournalMessage(data.message, 'Could not load merchandise');
  return data;
}

/** POST /journal — owner is taken from the auth token. */
export async function createJournal(
  client: AxiosInstance,
  payload: CreateJournalPayload
): Promise<JournalMessageResponse> {
  const { data } = await client.post<JournalMessageResponse>('/journal', payload);
  assertJournalMessage(data.message, 'Could not create merchandise');
  return data;
}

/** PATCH /journal/:ref — fields and/or status. */
export async function updateJournal(
  client: AxiosInstance,
  ref: number,
  payload: UpdateJournalPayload
): Promise<JournalMessageResponse> {
  const { data } = await client.patch<JournalMessageResponse>(`/journal/${ref}`, payload);
  assertJournalMessage(data.message, 'Could not update merchandise');
  return data;
}

/** DELETE /journal/:ref — soft delete. */
export async function deleteJournal(
  client: AxiosInstance,
  ref: number
): Promise<JournalMessageResponse> {
  const { data } = await client.delete<JournalMessageResponse>(`/journal/${ref}`);
  assertJournalMessage(data.message, 'Could not delete merchandise');
  return data;
}
