'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getProducts } from '@/api/endpoints/products';
import type { ClientProfileData } from '@/api/types/client-portal';
import type { StoreProduct } from '@/store/client-cart-store';
import { ProductCard } from '@/app/client-portal/components/product-card';
import { StoreCartSheet } from '@/app/store/components/store-cart-sheet';
import { StoreFiltersBar } from '@/app/store/components/store-filters-bar';
import type { SearchableOptionRow } from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { LoadingSpinner } from '@/components/loading-spinner';

function mapProduct(row: Record<string, unknown>): StoreProduct {
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

export function StoreContent({ client }: { client: ClientProfileData }) {
  const apiClient = useApiClient();
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: categoriesData } = useQuery({
    queryKey: ['store', 'categories'],
    queryFn: async () => {
      const res = await getProducts(apiClient, { limit: 100 });
      return (res.data ?? []).map((p) => mapProduct(p as Record<string, unknown>));
    },
  });

  const categoryOptions = useMemo<SearchableOptionRow[]>(() => {
    const categories = new Set<string>();
    for (const product of categoriesData ?? []) {
      if (product.category) categories.add(product.category);
    }
    return Array.from(categories)
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        value: category,
        label: category,
        icon: null,
      }));
  }, [categoriesData]);

  const { data, isLoading } = useQuery({
    queryKey: ['store', 'products', searchInput, categoryFilter],
    queryFn: async () => {
      const res = await getProducts(apiClient, {
        search: searchInput || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        limit: 100,
      });
      return (res.data ?? []).map((p) => mapProduct(p as Record<string, unknown>));
    },
  });

  const products = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-6">
      <StoreFiltersBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categoryOptions={categoryOptions}
        cartSlot={<StoreCartSheet client={client} />}
      />

      {isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No products found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.uid} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
