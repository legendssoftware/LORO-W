'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getProducts } from '@/api/endpoints/products';
import type { StoreProduct } from '@/store/client-cart-store';

export const STORE_PRODUCTS_QUERY_KEY_PREFIX = ['store', 'products'] as const;

const PAGE_SIZE = 100;

export function mapStoreProduct(row: Record<string, unknown>): StoreProduct {
  return {
    uid: Number(row.uid),
    name: String(row.name ?? ''),
    sku: row.sku != null ? String(row.sku) : undefined,
    price: row.price != null ? Number(row.price) : undefined,
    salePrice: row.salePrice != null ? Number(row.salePrice) : undefined,
    isOnPromotion: Boolean(row.isOnPromotion),
    imageUrl: row.imageUrl != null ? String(row.imageUrl) : undefined,
    brand: row.brand != null ? String(row.brand) : undefined,
    category: row.category != null ? String(row.category) : undefined,
    palletAvailable: Boolean(row.palletAvailable),
    palletPrice: row.palletPrice != null ? Number(row.palletPrice) : undefined,
    palletSalePrice: row.palletSalePrice != null ? Number(row.palletSalePrice) : undefined,
    palletOnPromotion: Boolean(row.palletOnPromotion),
    itemsPerPack: row.itemsPerPack != null ? Number(row.itemsPerPack) : undefined,
    packsPerPallet: row.packsPerPallet != null ? Number(row.packsPerPallet) : undefined,
  };
}

export function useProductsInfinite(options?: {
  search?: string;
  category?: string;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const search = (options?.search ?? '').trim() || undefined;
  const category = (options?.category ?? '').trim() || undefined;

  const result = useInfiniteQuery({
    queryKey: [...STORE_PRODUCTS_QUERY_KEY_PREFIX, 'infinite', search ?? '', category ?? ''],
    queryFn: async ({ pageParam }) => {
      const res = await getProducts(client, {
        page: pageParam,
        limit: PAGE_SIZE,
        search,
        category,
      });
      return res;
    },
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      const { page, totalPages } = meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const data =
    result.data?.pages.flatMap((page) =>
      (page.data ?? []).map((row) => mapStoreProduct(row as Record<string, unknown>))
    ) ?? [];

  return {
    ...result,
    data,
  };
}
