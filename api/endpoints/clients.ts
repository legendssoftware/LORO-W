import type { AxiosInstance } from 'axios';

/** Address shape returned by API for client. */
export interface ClientAddress {
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  googleMapsUrl?: string;
}

/** Minimal client for list/select (from GET /clients). */
export interface ClientListItem {
  uid: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  address?: ClientAddress;
  [key: string]: unknown;
}

export interface GetClientsResponse {
  data: ClientListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  message?: string;
}

/**
 * GET /clients - list org-scoped clients (paginated).
 */
export async function getClients(
  client: AxiosInstance,
  params?: { page?: number; limit?: number; search?: string }
): Promise<GetClientsResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.search) search.set('search', params.search);
  const qs = search.toString();
  const { data } = await client.get<GetClientsResponse>(`/clients${qs ? `?${qs}` : ''}`);
  return data;
}
