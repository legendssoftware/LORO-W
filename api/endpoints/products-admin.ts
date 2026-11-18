import type { AxiosInstance } from 'axios';

export interface StaffProduct {
  uid?: number;
  ref?: string;
  name: string;
  category?: string;
  price?: number;
  sku?: string;
  barcode?: string;
  status?: string;
  isDeleted?: boolean;
}

export async function listStaffProducts(client: AxiosInstance): Promise<StaffProduct[]> {
  const { data } = await client.get<{ data?: StaffProduct[]; products?: StaffProduct[] } | StaffProduct[]>('/products', {
    params: { page: 1, limit: 50 },
  });
  if (Array.isArray(data)) return data;
  return data.data ?? data.products ?? [];
}

export async function saveStaffProduct(
  client: AxiosInstance,
  payload: { ref?: string; name: string; category: string; price: number; sku: string; barcode: string }
): Promise<{ message?: string }> {
  if (payload.ref) {
    const { data } = await client.patch(`/products/${payload.ref}`, payload);
    return data;
  }
  const { data } = await client.post('/products', {
    ...payload,
    packageQuantity: 1,
    brand: 'LORO',
    weight: 1,
    stockQuantity: 0,
    productReferenceCode: payload.sku,
  });
  return data;
}

export async function archiveStaffProduct(client: AxiosInstance, ref: string): Promise<{ message?: string }> {
  const { data } = await client.delete(`/products/${ref}`);
  return data;
}

export async function restoreStaffProduct(client: AxiosInstance, ref: string): Promise<{ message?: string }> {
  const { data } = await client.patch(`/products/restore/${ref}`);
  return data;
}

export async function bulkUpdateProducts(
  client: AxiosInstance,
  updates: Array<{ ref: string; data: { price?: number } }>
): Promise<{ message?: string }> {
  const { data } = await client.patch('/products/bulk', { updates });
  return data;
}

export async function getProductAnalytics(client: AxiosInstance, id: string | number): Promise<Record<string, unknown>> {
  const { data } = await client.get(`/products/analytics/${id}`);
  return data ?? {};
}
