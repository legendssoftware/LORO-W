'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { mapStoreProduct, useProductsInfinite } from '@/api/hooks/use-products';
import { getProducts } from '@/api/endpoints/products';
import type { ClientProfileData } from '@/api/types/client-portal';
import { ProductCard } from '@/app/client-portal/components/product-card';
import { StoreCartSheet } from '@/app/store/components/store-cart-sheet';
import { StoreFiltersBar } from '@/app/store/components/store-filters-bar';
import type { SearchableOptionRow } from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';

export function StoreContent({ client }: { client: ClientProfileData }) {
  const apiClient = useApiClient();
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: categoriesData } = useQuery({
    queryKey: ['store', 'categories'],
    queryFn: async () => {
      const res = await getProducts(apiClient, { limit: 100 });
      return (res.data ?? []).map((p) => mapStoreProduct(p as Record<string, unknown>));
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

  const productsQuery = useProductsInfinite({
    search: searchInput,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  });

  const products = productsQuery.data;

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

      {productsQuery.isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No products found.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.uid} product={product} />
            ))}
          </div>
          {productsQuery.hasNextPage ? (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-200"
                disabled={productsQuery.isFetchingNextPage}
                onClick={() => productsQuery.fetchNextPage()}
              >
                {productsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
