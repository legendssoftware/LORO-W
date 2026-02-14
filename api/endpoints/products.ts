import type { AxiosInstance } from 'axios';
import type { ProductsListResponse } from '@/api/types/reports';

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

/**
 * GET /products - list products with optional filters.
 */
export async function getProducts(
  client: AxiosInstance,
  params: GetProductsParams = {}
): Promise<ProductsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.search) search.set('search', params.search);
  if (params.category) search.set('category', params.category);
  const qs = search.toString();
  const { data } = await client.get<ProductsListResponse>(
    `/products${qs ? `?${qs}` : ''}`
  );
  return data;
}
