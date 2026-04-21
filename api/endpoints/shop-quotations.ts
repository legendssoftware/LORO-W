import type { AxiosInstance } from 'axios';

/** Minimal quotation fields for pipeline / lists (matches shop Order subset). */
export interface ShopQuotationRow {
  uid: number;
  quotationNumber?: string;
  orderNumber?: string;
  status?: string;
  totalAmount?: number | string;
  createdAt?: string;
  isBlankQuotation?: boolean;
  title?: string;
  client?: { name?: string; uid?: number } | null;
  placedBy?: { uid?: number; name?: string; email?: string } | null;
}

export interface ShopQuotationsApiResponse {
  quotations: ShopQuotationRow[];
  message?: string;
}

/**
 * GET /shop/quotations — LORO quotations (scoped by role / managed team on server).
 */
export async function getShopQuotations(client: AxiosInstance): Promise<ShopQuotationsApiResponse> {
  const { data } = await client.get<ShopQuotationsApiResponse>('/shop/quotations');
  return data ?? { quotations: [], message: undefined };
}
