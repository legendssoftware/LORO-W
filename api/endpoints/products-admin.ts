import type { AxiosInstance } from 'axios';

export interface StaffProduct {
  uid?: number;
  productRef?: string;
  productReferenceCode?: string;
  name: string;
  description?: string;
  category?: string;
  price?: number | string;
  salePrice?: number | string;
  discount?: number | string;
  taxPercent?: number | string;
  sku?: string;
  barcode?: string;
  brand?: string;
  status?: string;
  imageUrl?: string;
  warehouseLocation?: string;
  stockQuantity?: number | string;
  trackStock?: boolean;
  reorderPoint?: number | string;
  packageQuantity?: number | string;
  packageUnit?: string;
  packageDetails?: string;
  weight?: number | string;
  isOnPromotion?: boolean;
  promotionStartDate?: string;
  promotionEndDate?: string;
  itemsPerPack?: number | string;
  packsPerPallet?: number | string;
  packPrice?: number | string;
  palletPrice?: number | string;
  packWeight?: number | string;
  palletWeight?: number | string;
  palletAvailable?: boolean;
  palletStockQuantity?: number | string;
  palletReorderPoint?: number | string;
  palletDiscount?: number | string;
  palletSku?: string;
  palletBarcode?: string;
  palletSalePrice?: number | string;
  palletOnPromotion?: boolean;
  palletPromotionStartDate?: string;
  palletPromotionEndDate?: string;
  palletDescription?: string;
  palletImageUrl?: string;
  minimumPalletOrderQuantity?: number | string;
  palletBulkDiscountPercentage?: number | string;
  palletBulkDiscountMinQty?: number | string;
  dimensions?: string;
  packDimensions?: string;
  palletDimensions?: string;
  manufacturer?: string;
  model?: string;
  color?: string;
  material?: string;
  warrantyPeriod?: number | string;
  warrantyUnit?: string;
  specifications?: string;
  features?: string;
  rating?: number | string;
  reviewCount?: number | string;
  origin?: string;
  isFragile?: boolean;
  requiresSpecialHandling?: boolean;
  storageConditions?: string;
  minimumOrderQuantity?: number | string;
  bulkDiscountPercentage?: number | string;
  bulkDiscountMinQty?: number | string;
  isDeleted?: boolean;
}

export interface StaffProductPage {
  rows: StaffProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function listStaffProducts(
  client: AxiosInstance,
  params: { page: number; limit: number; search?: string },
): Promise<StaffProductPage> {
  const { data } = await client.get<{ data?: StaffProduct[]; meta?: StaffProductPage['meta'] } | StaffProduct[]>('/products', {
    params,
  });
  if (Array.isArray(data)) {
    return { rows: data, meta: { total: data.length, page: params.page, limit: params.limit, totalPages: 1 } };
  }
  const rows = data.data ?? [];
  return {
    rows,
    meta: data.meta ?? { total: rows.length, page: params.page, limit: params.limit, totalPages: 1 },
  };
}

export async function getStaffProduct(client: AxiosInstance, uid: number): Promise<StaffProduct | null> {
  const { data } = await client.get<{ product?: StaffProduct | null }>(`/products/${uid}`);
  return data.product ?? null;
}

export async function saveStaffProduct(
  client: AxiosInstance,
  payload: { uid?: number; body: Record<string, unknown> },
): Promise<{ message?: string }> {
  if (payload.uid) {
    const { data } = await client.patch(`/products/${payload.uid}`, payload.body);
    return data;
  }
  const { data } = await client.post('/products', payload.body);
  return data;
}

export async function archiveStaffProduct(client: AxiosInstance, uid: number): Promise<{ message?: string }> {
  const { data } = await client.delete(`/products/${uid}`);
  return data;
}

export async function restoreStaffProduct(client: AxiosInstance, uid: number): Promise<{ message?: string }> {
  const { data } = await client.patch(`/products/restore/${uid}`);
  return data;
}

export async function bulkUpdateProducts(
  client: AxiosInstance,
  updates: Array<{ ref: number; data: { price?: number } }>,
): Promise<{ message?: string }> {
  const { data } = await client.patch('/products/bulk', { updates });
  return data;
}

export async function getProductAnalytics(client: AxiosInstance, id: string | number): Promise<Record<string, unknown>> {
  const { data } = await client.get(`/products/analytics/${id}`);
  return data ?? {};
}
