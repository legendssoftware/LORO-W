'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ShoppingCart, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getProducts } from '@/api/endpoints/products';
import { createShopQuotation } from '@/api/endpoints/shop';
import type { ClientProfileData } from '@/api/types/client-portal';
import { LINKED_CLIENT_FULL_PROFILE_QUERY_KEY } from '@/api/hooks/use-linked-client-profile';
import {
  buildCheckoutPayload,
  useClientCartStore,
  type StoreProduct,
} from '@/store/client-cart-store';
import { formatZar } from '@/lib/client-portal-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const items = useClientCartStore((s) => s.items);
  const addItem = useClientCartStore((s) => s.addItem);
  const updateQuantity = useClientCartStore((s) => s.updateQuantity);
  const removeItem = useClientCartStore((s) => s.removeItem);
  const clear = useClientCartStore((s) => s.clear);
  const cartTotal = useClientCartStore((s) => s.cartTotal);
  const itemCount = useClientCartStore((s) => s.itemCount);

  const { data, isLoading } = useQuery({
    queryKey: ['store', 'products', search],
    queryFn: async () => {
      const res = await getProducts(apiClient, {
        search: search || undefined,
        limit: 100,
      });
      return (res.data ?? []).map((p) => mapProduct(p as Record<string, unknown>));
    },
  });

  const products = useMemo(() => data ?? [], [data]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('Cart is empty');
      const payload = buildCheckoutPayload(items, client.uid);
      return createShopQuotation(apiClient, payload);
    },
    onSuccess: () => {
      toast.success('Quotation submitted');
      clear();
      queryClient.invalidateQueries({ queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY });
    },
    onError: () => toast.error('Checkout failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/orders">My orders</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <ShoppingCart className="size-4 mr-2" />
                Cart ({itemCount()})
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Cart</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-3 py-4">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Your cart is empty
                  </p>
                ) : (
                  items.map((line) => (
                    <div
                      key={`${line.uid}-${line.purchaseMode}`}
                      className="flex justify-between gap-2 border-b pb-3"
                    >
                      <div>
                        <p className="font-medium text-sm">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatZar(line.unitPrice)} × {line.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() =>
                            updateQuantity(line.uid, line.purchaseMode, line.quantity - 1)
                          }
                        >
                          −
                        </Button>
                        <span className="text-sm w-6 text-center">{line.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8"
                          onClick={() =>
                            updateQuantity(line.uid, line.purchaseMode, line.quantity + 1)
                          }
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(line.uid, line.purchaseMode)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {items.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <p className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatZar(cartTotal())}</span>
                  </p>
                  <Button
                    className="w-full"
                    disabled={checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate()}
                  >
                    {checkoutMutation.isPending ? 'Submitting…' : 'Submit quotation'}
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No products found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.uid}
              product={product}
              onAdd={() => {
                addItem(product);
                toast.success('Added to cart');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: StoreProduct;
  onAdd: () => void;
}) {
  const price =
    product.isOnPromotion && product.salePrice != null
      ? product.salePrice
      : product.price ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
        {product.category && (
          <Badge variant="outline" className="w-fit text-xs">
            {product.category}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-lg font-semibold">{formatZar(price)}</p>
        {product.sku && (
          <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="sm" onClick={onAdd}>
          Add to cart
        </Button>
      </CardFooter>
    </Card>
  );
}
