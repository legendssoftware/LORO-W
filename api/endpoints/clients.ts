import type { AxiosInstance } from 'axios';
import type {
  GetClientsResponse,
  GetClientResponse,
  CreateClientPayload,
  UpdateClientPayload,
  ClientMutationMessageResponse,
  ClientListItem,
} from '@/api/types/clients';

export type {
  ClientListItem,
  ClientAddress,
  GetClientsResponse,
  GetClientResponse,
  CreateClientPayload,
  UpdateClientPayload,
} from '@/api/types/clients';

export interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
}

/** When omitted, matches server default for GET /clients (max 100 per page). */
const DEFAULT_GET_CLIENTS_PAGE_SIZE = 100;

/**
 * GET /clients - list org-scoped clients (paginated).
 */
export async function getClients(
  client: AxiosInstance,
  params?: GetClientsParams
): Promise<GetClientsResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? DEFAULT_GET_CLIENTS_PAGE_SIZE;
  const search = new URLSearchParams();
  search.set('page', String(page));
  search.set('limit', String(limit));
  if (params?.search) search.set('search', params.search);
  if (params?.status) search.set('status', params.status);
  if (params?.category) search.set('category', params.category);
  const qs = search.toString();
  const { data } = await client.get<GetClientsResponse>(`/clients${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /clients/map-data — all geocoded clients for the visualiser (unpaginated).
 */
export async function getClientsMapData(
  client: AxiosInstance
): Promise<ClientListItem[]> {
  const { data } = await client.get<ClientListItem[] | { data?: ClientListItem[] }>(
    '/clients/map-data'
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * GET /clients/:ref — ref is numeric uid.
 */
export async function getClient(
  client: AxiosInstance,
  ref: number
): Promise<GetClientResponse> {
  const { data } = await client.get<GetClientResponse>(`/clients/${ref}`);
  return data;
}

export async function createClient(
  client: AxiosInstance,
  payload: CreateClientPayload
): Promise<ClientMutationMessageResponse> {
  const { data } = await client.post<ClientMutationMessageResponse>('/clients', payload);
  return data;
}

export async function updateClient(
  client: AxiosInstance,
  ref: number,
  payload: UpdateClientPayload
): Promise<ClientMutationMessageResponse> {
  const { data } = await client.patch<ClientMutationMessageResponse>(
    `/clients/${ref}`,
    payload
  );
  return data;
}

export async function deleteClient(
  client: AxiosInstance,
  ref: number
): Promise<ClientMutationMessageResponse> {
  const { data } = await client.delete<ClientMutationMessageResponse>(`/clients/${ref}`);
  return data;
}

export async function restoreClient(
  client: AxiosInstance,
  ref: number
): Promise<ClientMutationMessageResponse> {
  const { data } = await client.patch<ClientMutationMessageResponse>(
    `/clients/restore/${ref}`
  );
  return data;
}
