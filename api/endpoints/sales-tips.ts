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
