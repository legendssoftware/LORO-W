'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Store, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks/use-api-client';
import { createShopQuotation } from '@/api/endpoints/shop';
import type { ClientProfileData } from '@/api/types/client-portal';
import { LINKED_CLIENT_FULL_PROFILE_QUERY_KEY } from '@/api/hooks/use-linked-client-profile';
import {
  buildCheckoutPayload,
  useClientCartStore,
} from '@/store/client-cart-store';
import { CartQuantityControl } from '@/app/store/components/cart-quantity-control';
import { formatZar } from '@/lib/client-portal-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type DeliveryMethod = 'collect' | 'deliver';

export function StoreCartSheet({
  client,
  className,
}: {
  client: ClientProfileData;
  className?: string;
}) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const items = useClientCartStore((s) => s.items);
  const updateQuantity = useClientCartStore((s) => s.updateQuantity);
  const removeItem = useClientCartStore((s) => s.removeItem);
  const clear = useClientCartStore((s) => s.clear);
  const cartTotal = useClientCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.totalPrice, 0)
  );
  const itemCount = useClientCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  const [open, setOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('collect');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  function resetCheckoutFields() {
    setPromoCode('');
    setDeliveryMethod('collect');
    setDeliveryAddress('');
  }

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('Cart is empty');
      if (deliveryMethod === 'deliver' && !deliveryAddress.trim()) {
        throw new Error('Delivery address is required');
      }
      const payload = buildCheckoutPayload(items, client.uid, {
        promoCode: promoCode.trim() || undefined,
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim() || undefined,
      });
      return createShopQuotation(apiClient, payload);
    },
    onSuccess: () => {
      toast.success('Quotation submitted');
      clear();
      resetCheckoutFields();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Checkout failed';
      toast.error(message);
    },
  });

  function handleCheckout() {
    if (deliveryMethod === 'deliver' && !deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
    checkoutMutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className={cn(
            'h-9 shrink-0 bg-green-600 text-white hover:bg-green-700',
            className
          )}
        >
          <ShoppingCart className="size-4 mr-2" />
          Cart ({itemCount})
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        overlayClassName="bg-white/20 backdrop-blur-sm"
        className={cn(
          'flex w-full flex-col gap-0 p-0 sm:max-w-md',
          '!top-4 !bottom-4 !right-4 !left-auto !h-auto max-h-[calc(100vh-2rem)]',
          'rounded-xl border shadow-2xl'
        )}
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Cart</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((line) => (
                <div
                  key={`${line.uid}-${line.purchaseMode}`}
                  className="flex justify-between gap-2 border-b pb-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm line-clamp-2">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatZar(line.unitPrice)} × {line.quantity}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <CartQuantityControl
                      size="md"
                      quantity={line.quantity}
                      onChange={(quantity) =>
                        updateQuantity(line.uid, line.purchaseMode, quantity)
                      }
                    />
                    <Button
                      size="xs"
                      variant="cancel"
                      className="mt-2"
                      onClick={() => removeItem(line.uid, line.purchaseMode)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-t p-4 sm:flex-col sm:space-x-0 gap-4">
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Delivery method
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'flex-1 gap-2',
                      deliveryMethod === 'collect' &&
                        'border-primary bg-primary/10 text-primary'
                    )}
                    onClick={() => setDeliveryMethod('collect')}
                  >
                    <Store className="size-4" />
                    Collect
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'flex-1 gap-2',
                      deliveryMethod === 'deliver' &&
                        'border-primary bg-primary/10 text-primary'
                    )}
                    onClick={() => setDeliveryMethod('deliver')}
                  >
                    <Truck className="size-4" />
                    Deliver
                  </Button>
                </div>
                {deliveryMethod === 'deliver' && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="delivery-address"
                      className="text-xs font-semibold uppercase text-muted-foreground"
                    >
                      Delivery address
                    </Label>
                    <Textarea
                      id="delivery-address"
                      placeholder="Enter delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="promo-code"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Promo code (optional)
                </Label>
                <Input
                  id="promo-code"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="text-sm"
                  autoCapitalize="off"
                />
              </div>

              <p className="flex w-full justify-between font-semibold">
                <span>Total</span>
                <span>{formatZar(cartTotal)}</span>
              </p>
            </div>

            <Button
              className="w-full bg-purple-600 text-white hover:bg-purple-700"
              disabled={checkoutMutation.isPending}
              onClick={handleCheckout}
            >
              {checkoutMutation.isPending ? 'Submitting…' : 'Submit quotation'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
