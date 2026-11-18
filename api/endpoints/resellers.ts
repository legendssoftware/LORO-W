import type { AxiosInstance } from 'axios';
import type { ResellersListResponse } from '@/api/types/reports';

export interface GetResellersParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * GET /resellers - list resellers.
 */
export async function getResellers(
  client: AxiosInstance,
  params: GetResellersParams = {}
): Promise<ResellersListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  const { data } = await client.get<ResellersListResponse>(
    `/resellers${qs ? `?${qs}` : ''}`
  );
  return data;
}

export interface ResellerRecord {
  uid?: number;
  ref?: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  isDeleted?: boolean;
}

export async function saveReseller(
  client: AxiosInstance,
  payload: ResellerRecord
): Promise<{ message?: string }> {
  const body = {
    name: payload.name,
    description: payload.name,
    logo: '',
    website: payload.website || 'https://example.com',
    contactPerson: payload.name,
    phone: payload.phone || '0000000000',
    email: payload.email || 'reseller@example.com',
    address: { street: '—', city: '—', state: '—', country: 'ZA', postalCode: '0000' },
  };
  if (payload.ref) {
    const { data } = await client.patch(`/resellers/${payload.ref}`, body);
    return data;
  }
  const { data } = await client.post('/resellers', body);
  return data;
}

export async function archiveReseller(client: AxiosInstance, ref: string): Promise<{ message?: string }> {
  const { data } = await client.delete(`/resellers/${ref}`);
  return data;
}

export async function restoreReseller(client: AxiosInstance, ref: string): Promise<{ message?: string }> {
  const { data } = await client.patch(`/resellers/restore/${ref}`);
  return data;
}
