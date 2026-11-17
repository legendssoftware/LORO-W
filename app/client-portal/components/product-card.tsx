'use client';

import { useState } from 'react';
import { useClientCartStore, type PurchaseMode, type StoreProduct } from '@/store/client-cart-store';
import { CartQuantityControl } from '@/app/store/components/cart-quantity-control';
import { formatZar } from '@/lib/client-portal-utils';
import {
  DEFAULT_PRODUCT_IMAGE_URL,
  canOrderByBox,
  canOrderByPallet,
  getProductDisplayName,
  getProductImageUri,
} from '@/lib/product-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BuyOption {
  mode: PurchaseMode;
  label: string;
  detail: string;
}

/**
 * Price and unit count for one way of buying the product.
 * @param product Catalog product
 * @param mode Selected purchase mode
 */
function modePrice(product: StoreProduct, mode: PurchaseMode): number {
  if (mode === 'box') return product.packPrice ?? 0;
  if (mode === 'palette') {
    return product.palletOnPromotion && product.palletSalePrice != null
      ? product.palletSalePrice
      : product.palletPrice ?? 0;
  }
  return product.isOnPromotion && product.salePrice != null ? product.salePrice : product.price ?? 0;
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const [imageError, setImageError] = useState(false);
  const [mode, setMode] = useState<PurchaseMode>('item');
  const addItem = useClientCartStore((s) => s.addItem);
  const updateQuantity = useClientCartStore((s) => s.updateQuantity);
  const cartQuantity = useClientCartStore(
    (s) => s.items.find((i) => i.uid === product.uid && i.purchaseMode === mode)?.quantity ?? 0
  );

  const boxEnabled = canOrderByBox(product);
  const palletEnabled = canOrderByPallet(product);
  const selectedMode: PurchaseMode =
    mode === 'box' && boxEnabled ? 'box' : mode === 'palette' && palletEnabled ? 'palette' : 'item';
  const inCart = cartQuantity > 0;
  const price = modePrice(product, selectedMode);
  const displayName = getProductDisplayName(product.name);
  const imageSrc = imageError
    ? DEFAULT_PRODUCT_IMAGE_URL
    : getProductImageUri(product.imageUrl, product);
  const subtitle = product.category ?? product.brand;
  const palletUnits = (product.itemsPerPack ?? 1) * (product.packsPerPallet ?? 1);

  const options: BuyOption[] = [{ mode: 'item', label: 'Individual', detail: formatZar(modePrice(product, 'item')) }];
  if (boxEnabled) {
    options.push({
      mode: 'box',
      label: 'Box',
      detail: `${formatZar(product.packPrice ?? 0)} · ${product.itemsPerPack} units`,
    });
  }
  if (palletEnabled) {
    options.push({
      mode: 'palette',
      label: 'Pallet',
      detail: `${formatZar(product.palletPrice ?? 0)} · ${palletUnits} units`,
    });
  }

  function handleAdd() {
    addItem(product, 1, selectedMode);
  }

  function handleQuantityChange(quantity: number) {
    updateQuantity(product.uid, selectedMode, quantity);
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
        {product.isOnPromotion && selectedMode === 'item' && (
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
        {selectedMode === 'item' &&
          product.isOnPromotion &&
          product.salePrice != null &&
          product.price != null &&
          product.price > product.salePrice && (
            <p className="text-[10px] text-muted-foreground line-through">
              {formatZar(product.price)}
            </p>
          )}
        {selectedMode === 'box' && product.itemsPerPack ? (
          <p className="text-[10px] text-muted-foreground">{product.itemsPerPack} units per box</p>
        ) : null}
        {selectedMode === 'palette' && palletUnits > 1 ? (
          <p className="text-[10px] text-muted-foreground">{palletUnits} units per pallet</p>
        ) : null}
        {options.length > 1 && (
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => setMode(value as PurchaseMode)}
            className="mt-2 gap-1.5"
            aria-label="Buy as"
          >
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Buy as</p>
            {options.map((option) => (
              <div key={option.mode} className="flex items-center gap-2">
                <RadioGroupItem value={option.mode} id={`${product.uid}-${option.mode}`} />
                <Label htmlFor={`${product.uid}-${option.mode}`} className="text-xs font-normal">
                  {option.label} · {option.detail}
                </Label>
              </div>
            ))}
          </RadioGroup>
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
