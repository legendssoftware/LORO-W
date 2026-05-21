'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useClientCartStore, type StoreProduct } from '@/store/client-cart-store';
import { CartQuantityControl } from '@/app/store/components/cart-quantity-control';
import { formatZar } from '@/lib/client-portal-utils';
import {
  DEFAULT_PRODUCT_IMAGE_URL,
  getProductDisplayName,
  getProductImageUri,
} from '@/lib/product-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';

const PURCHASE_MODE = 'item' as const;

export function ProductCard({ product }: { product: StoreProduct }) {
  const [imageError, setImageError] = useState(false);
  const addItem = useClientCartStore((s) => s.addItem);
  const updateQuantity = useClientCartStore((s) => s.updateQuantity);
  const cartQuantity = useClientCartStore(
    (s) =>
      s.items.find(
        (i) => i.uid === product.uid && i.purchaseMode === PURCHASE_MODE
      )?.quantity ?? 0
  );

  const inCart = cartQuantity > 0;
  const price =
    product.isOnPromotion && product.salePrice != null
      ? product.salePrice
      : product.price ?? 0;
  const displayName = getProductDisplayName(product.name);
  const imageSrc = imageError
    ? DEFAULT_PRODUCT_IMAGE_URL
    : getProductImageUri(product.imageUrl, product);
  const subtitle = product.category ?? product.brand;

  function handleAdd() {
    addItem(product);
    toast.success('Added to cart');
  }

  function handleQuantityChange(quantity: number) {
    updateQuantity(product.uid, PURCHASE_MODE, quantity);
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative flex h-32 items-center justify-center bg-muted">
        <img
          src={imageSrc}
          alt={displayName}
          className="h-full w-full object-contain p-2"
          onError={() => setImageError(true)}
        />
        {product.isOnPromotion && (
          <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
            Sale
          </Badge>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-0.5 px-3 pt-2 pb-1">
        {subtitle && (
          <p className="text-[10px] font-medium text-primary line-clamp-1">
            {subtitle}
          </p>
        )}
        <CardTitle className="text-sm font-medium leading-snug line-clamp-2">
          {product.name}
        </CardTitle>
        <p className="text-base font-semibold">{formatZar(price)}</p>
        {product.isOnPromotion &&
          product.salePrice != null &&
          product.price != null &&
          product.price > product.salePrice && (
            <p className="text-[10px] text-muted-foreground line-through">
              {formatZar(product.price)}
            </p>
          )}
        {product.sku && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            SKU: {product.sku}
          </p>
        )}
      </CardContent>
      <CardFooter className="px-3 pt-0 pb-3">
        {inCart ? (
          <CartQuantityControl
            className="w-full"
            quantity={cartQuantity}
            onChange={handleQuantityChange}
          />
        ) : (
          <Button
            type="button"
            className="w-full bg-purple-600 text-white hover:bg-purple-700"
            size="sm"
            onClick={handleAdd}
          >
            Add to cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
