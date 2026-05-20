'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PurchaseMode = 'item' | 'palette';

export interface StoreProduct {
  uid: number;
  name?: string;
  sku?: string;
  price?: number;
  salePrice?: number;
  isOnPromotion?: boolean;
  imageUrl?: string;
  category?: string;
  palletAvailable?: boolean;
  palletPrice?: number;
  palletSalePrice?: number;
  palletOnPromotion?: boolean;
  itemsPerPack?: number;
  packsPerPallet?: number;
}

export interface CartLine extends StoreProduct {
  quantity: number;
  purchaseMode: PurchaseMode;
  unitPrice: number;
  totalPrice: number;
  itemsPerUnit: number;
}

interface ClientCartState {
  items: CartLine[];
  addItem: (product: StoreProduct, quantity?: number, mode?: PurchaseMode) => void;
  updateQuantity: (uid: number, mode: PurchaseMode, quantity: number) => void;
  removeItem: (uid: number, mode: PurchaseMode) => void;
  clear: () => void;
  cartTotal: () => number;
  itemCount: () => number;
}

function calcPricing(product: StoreProduct, mode: PurchaseMode) {
  if (mode === 'palette' && product.palletAvailable) {
    const unitPrice =
      product.palletOnPromotion && product.palletSalePrice != null
        ? product.palletSalePrice
        : product.palletPrice ?? product.price ?? 0;
    const itemsPerUnit =
      (product.itemsPerPack ?? 1) * (product.packsPerPallet ?? 1);
    return { unitPrice, itemsPerUnit };
  }
  const unitPrice =
    product.isOnPromotion && product.salePrice != null
      ? product.salePrice
      : product.price ?? 0;
  return { unitPrice, itemsPerUnit: 1 };
}

export const useClientCartStore = create<ClientCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, mode = 'item') => {
        const { unitPrice, itemsPerUnit } = calcPricing(product, mode);
        const key = `${product.uid}-${mode}`;
        set((state) => {
          const existing = state.items.find(
            (i) => `${i.uid}-${i.purchaseMode}` === key
          );
          if (existing) {
            const qty = existing.quantity + quantity;
            return {
              items: state.items.map((i) =>
                `${i.uid}-${i.purchaseMode}` === key
                  ? {
                      ...i,
                      quantity: qty,
                      totalPrice: Number((qty * i.unitPrice).toFixed(2)),
                    }
                  : i
              ),
            };
          }
          const line: CartLine = {
            ...product,
            quantity,
            purchaseMode: mode,
            unitPrice,
            itemsPerUnit,
            totalPrice: Number((quantity * unitPrice).toFixed(2)),
          };
          return { items: [...state.items, line] };
        });
      },
      updateQuantity: (uid, mode, quantity) => {
        if (quantity <= 0) {
          get().removeItem(uid, mode);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.uid === uid && i.purchaseMode === mode
              ? {
                  ...i,
                  quantity,
                  totalPrice: Number((quantity * i.unitPrice).toFixed(2)),
                }
              : i
          ),
        }));
      },
      removeItem: (uid, mode) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.uid === uid && i.purchaseMode === mode)
          ),
        }));
      },
      clear: () => set({ items: [] }),
      cartTotal: () =>
        Number(
          get()
            .items.reduce((s, i) => s + i.totalPrice, 0)
            .toFixed(2)
        ),
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'loro-client-cart' }
  )
);

export function buildCheckoutPayload(
  items: CartLine[],
  clientUid: number,
  promoCode?: string
) {
  const processedItems = items.map((item) => ({
    uid: item.uid,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    purchaseMode: item.purchaseMode,
    itemsPerUnit: item.itemsPerUnit,
    sku: item.sku,
  }));
  const totalAmount = processedItems.reduce((s, i) => s + i.totalPrice, 0);
  const totalItems = processedItems.reduce(
    (s, i) => s + i.quantity * i.itemsPerUnit,
    0
  );
  return {
    items: processedItems,
    client: { uid: clientUid },
    totalAmount: totalAmount.toFixed(2),
    totalItems: String(totalItems),
    promoCode,
  };
}
