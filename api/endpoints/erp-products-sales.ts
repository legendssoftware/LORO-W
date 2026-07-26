import type { AxiosInstance } from 'axios';

export interface ProductSalesRow {
  itemCode?: string;
  description?: string;
  category?: string;
  totalRevenue?: number;
  totalQuantity?: number;
  transactionCount?: number;
}

export interface ProductsSalesApiResponse {
  success: boolean;
  startDate: string;
  endDate: string;
  salesPerProduct: ProductSalesRow[];
  errors?: Array<{ countryCode: string; message: string }>;
  orgId?: string;
  error?: string;
}

export interface GetProductsSalesParams {
  startDate?: string;
  endDate?: string;
  /** Comma-separated codes or ALL. Defaults to ALL for group-wide rollup. */
  countries?: string;
  /** Max products after merge (default 10). */
  limit?: number;
}

/**
 * GET /erp/products/sales — top products by Pastel revenue across ERP countries.
 */
export async function getProductsSales(
  client: AxiosInstance,
  params?: GetProductsSalesParams,
): Promise<ProductsSalesApiResponse> {
  const { data } = await client.get<ProductsSalesApiResponse>(
    '/erp/products/sales',
    {
      params: {
        startDate: params?.startDate,
        endDate: params?.endDate,
        countries: params?.countries ?? 'ALL',
        limit: params?.limit ?? 10,
      },
    }
  );
  return data;
}
