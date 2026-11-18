import type { AxiosInstance } from 'axios';

export interface SalesTip {
  uid?: number;
  id?: string;
  title?: string;
  content?: string;
  category?: string;
}

/**
 * GET /sales-tips - list all sales tips.
 */
export async function getSalesTips(
  client: AxiosInstance
): Promise<SalesTip[]> {
  const { data } = await client.get<SalesTip[]>('/sales-tips');
  return Array.isArray(data) ? data : [];
}

export async function getTipOfTheDay(client: AxiosInstance): Promise<SalesTip> {
  const { data } = await client.get<SalesTip>('/sales-tips/tip-of-the-day');
  return data;
}

export async function saveSalesTip(
  client: AxiosInstance,
  payload: { id?: number; title: string; content: string; category: string; order?: number }
): Promise<SalesTip> {
  if (payload.id) {
    const { data } = await client.patch<SalesTip>(`/sales-tips/${payload.id}`, payload);
    return data;
  }
  const { data } = await client.post<SalesTip>('/sales-tips', payload);
  return data;
}

export async function deleteSalesTip(client: AxiosInstance, id: number): Promise<SalesTip> {
  const { data } = await client.delete<SalesTip>(`/sales-tips/${id}`);
  return data;
}
