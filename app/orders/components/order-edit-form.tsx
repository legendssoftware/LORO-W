'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Store, Truck } from 'lucide-react';
import type { ClientQuotation } from '@/api/types/client-portal';
import { useUpdateClientOrder } from '@/api/hooks/use-client-orders';
import { useProductsInfinite } from '@/api/hooks/use-products';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  lineTotal,
  orderLinesFromQuotation,
  type OrderLineDraft,
} from '@/lib/client-order-actions';
import { formatZar } from '@/lib/client-portal-utils';
import { DEFAULT_PRODUCT_IMAGE_URL } from '@/lib/quotation-line-item';
import { buildCheckoutPayload, type StoreProduct } from '@/store/client-cart-store';
import { CartQuantityControl } from '@/app/store/components/cart-quantity-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type DeliveryMethod = 'collect' | 'deliver';

function asDelivery(value?: string): DeliveryMethod {
  return value === 'deliver' ? 'deliver' : 'collect';
}

function itemPrice(product: StoreProduct): number {
  if (product.isOnPromotion && product.salePrice != null) return product.salePrice;
  return product.price ?? 0;
}

export function OrderEditForm({
  order,
  clientUid,
  onCancel,
  onSaved,
}: {
  order: ClientQuotation;
  clientUid: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('portal');
  const updateOrder = useUpdateClientOrder();
  const [lines, setLines] = useState<OrderLineDraft[]>(() => orderLinesFromQuotation(order));
  const [promoCode, setPromoCode] = useState(order.promoCode ?? '');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    asDelivery(order.deliveryMethod)
  );
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress ?? '');
  const [productSearch, setProductSearch] = useState('');
  const productsQuery = useProductsInfinite({
    search: productSearch,
    enabled: productSearch.trim().length > 0,
  });

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line), 0),
    [lines]
  );

  function updateQuantity(index: number, quantity: number) {
    setLines((current) => {
      if (quantity <= 0) return current.filter((_, lineIndex) => lineIndex !== index);
      return current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, quantity } : line
      );
    });
  }

  function addProduct(product: StoreProduct) {
    setLines((current) => {
      const existingIndex = current.findIndex(
        (line) => line.productUid === product.uid && line.purchaseMode === 'item'
      );
      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...current,
        {
          productUid: product.uid,
          name: product.name?.trim() || t('productFallback'),
          sku: product.sku,
          imageSrc: product.imageUrl,
          quantity: 1,
          unitPrice: itemPrice(product),
          purchaseMode: 'item',
          itemsPerUnit: 1,
        },
      ];
    });
    setProductSearch('');
  }

  function handleSave() {
    if (lines.length === 0) {
      toast.error(t('editLinesRequired'));
      return;
    }
    if (deliveryMethod === 'deliver' && !deliveryAddress.trim()) {
      toast.error(t('deliveryAddressRequired'));
      return;
    }
    const payload = buildCheckoutPayload(
      lines.map((line) => ({
        uid: line.productUid,
        name: line.name,
        sku: line.sku,
        imageUrl: line.imageSrc,
        quantity: line.quantity,
        purchaseMode: line.purchaseMode,
        unitPrice: line.unitPrice,
        itemsPerUnit: line.itemsPerUnit,
        totalPrice: lineTotal(line),
      })),
      clientUid,
      {
        promoCode: promoCode.trim(),
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim() || undefined,
      }
    );
    updateOrder.mutate(
      { quotationId: order.uid, payload },
      {
        onSuccess: () => {
          toast.success(t('orderUpdated'));
          onSaved();
        },
        onError: (error) => {
          toast.error(getQueryErrorMessage(error, t('orderUpdateFailed')));
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {lines.map((line, index) => (
          <li
            key={`${line.productUid}-${line.purchaseMode}-${index}`}
            className="flex gap-3 rounded border p-3"
          >
            <img
              src={line.imageSrc || DEFAULT_PRODUCT_IMAGE_URL}
              alt={line.name}
              width={56}
              height={56}
              className="size-14 shrink-0 rounded object-contain bg-muted/30"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm leading-snug">{line.name}</p>
              {line.sku ? (
                <p className="text-xs text-muted-foreground mt-0.5">SKU: {line.sku}</p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-1">
                {formatZar(line.unitPrice)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CartQuantityControl
                  quantity={line.quantity}
                  onChange={(quantity) => updateQuantity(index, quantity)}
                />
                <Button
                  type="button"
                  size="xs"
                  variant="cancel"
                  onClick={() => updateQuantity(index, 0)}
                >
                  {t('removeLine')}
                </Button>
              </div>
            </div>
            <p className="text-sm font-semibold shrink-0">{formatZar(lineTotal(line))}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <Label htmlFor="order-add-product">{t('addProduct')}</Label>
        <Input
          id="order-add-product"
          value={productSearch}
          placeholder={t('searchProducts')}
          onChange={(event) => setProductSearch(event.target.value)}
        />
        {productSearch.trim() ? (
          <div className="max-h-48 overflow-y-auto rounded border">
            {productsQuery.isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">{t('searchingProducts')}</p>
            ) : productsQuery.data.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{t('noProducts')}</p>
            ) : (
              productsQuery.data.slice(0, 8).map((product) => (
                <button
                  key={product.uid}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
                  onClick={() => addProduct(product)}
                >
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="shrink-0 font-medium">{formatZar(itemPrice(product))}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          {t('deliveryMethod')}
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              'flex-1 gap-2',
              deliveryMethod === 'collect' && 'border-primary bg-primary/10 text-primary'
            )}
            onClick={() => setDeliveryMethod('collect')}
          >
            <Store className="size-4" />
            {t('collect')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'flex-1 gap-2',
              deliveryMethod === 'deliver' && 'border-primary bg-primary/10 text-primary'
            )}
            onClick={() => setDeliveryMethod('deliver')}
          >
            <Truck className="size-4" />
            {t('deliver')}
          </Button>
        </div>
        {deliveryMethod === 'deliver' ? (
          <div className="space-y-1.5">
            <Label htmlFor="order-delivery-address">{t('deliveryAddress')}</Label>
            <Textarea
              id="order-delivery-address"
              value={deliveryAddress}
              rows={3}
              className="resize-none text-sm"
              onChange={(event) => setDeliveryAddress(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order-promo-code">{t('promoCode')}</Label>
        <Input
          id="order-promo-code"
          value={promoCode}
          autoCapitalize="off"
          onChange={(event) => setPromoCode(event.target.value)}
        />
      </div>

      <p className="flex justify-between font-semibold">
        <span>{t('total')}</span>
        <span>{formatZar(total)}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={updateOrder.isPending}>
          {t('discardChanges')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={updateOrder.isPending}>
          {updateOrder.isPending ? t('savingOrder') : t('saveOrder')}
        </Button>
      </div>
    </div>
  );
}
