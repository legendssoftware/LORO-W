import type { AxiosInstance } from 'axios';
import type { GetShopBannersResponse } from '@/api/types/organisation-banner';

export interface CheckoutItem {
  uid: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseMode?: string;
  itemsPerUnit?: number;
  sku?: string;
}

export interface CreateQuotationPayload {
  items: CheckoutItem[];
  client: { uid: number };
  totalAmount: string;
  totalItems: string;
  promoCode?: string;
  deliveryMethod?: 'collect' | 'deliver';
  deliveryAddress?: string;
}

export interface CreateQuotationResponse {
  message?: string;
  quotationId?: string;
  quotationNumber?: string;
}

/** GET /shop/banners — same feed as the mobile app carousel (latest 5 published). */
export async function getShopBanners(
  client: AxiosInstance
): Promise<GetShopBannersResponse> {
  const { data } = await client.get<GetShopBannersResponse>('/shop/banners');
  return data;
}

/** POST /shop/quotation — create quotation from cart. */
export async function createShopQuotation(
  client: AxiosInstance,
  payload: CreateQuotationPayload
): Promise<CreateQuotationResponse> {
  const { data } = await client.post<CreateQuotationResponse>(
    '/shop/quotation',
    payload
  );
  return data;
}

/** PUT /shop/quotation/:id/client — client updates own quotation */
export async function updateShopQuotationForClient(
  client: AxiosInstance,
  quotationId: number,
  payload: Record<string, unknown>
): Promise<{ message?: string }> {
  const { data } = await client.put<{ message?: string }>(
    `/shop/quotation/${quotationId}/client`,
    payload
  );
  return data;
}
