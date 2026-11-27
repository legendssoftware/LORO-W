'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { ClientQuotation } from '@/api/types/client-portal';
import {
  draftToCartLines,
  orderLinesFromQuotation,
} from '@/lib/client-order-actions';
import { useClientCartStore } from '@/store/client-cart-store';

/**
 * Copies an order's lines into the store cart and opens it.
 * @param stayOnPage When true, stays on the current page. Otherwise opens the store.
 */
export function useReorderOrder() {
  const { t } = useTranslation('portal');
  const router = useRouter();
  const loadLines = useClientCartStore((state) => state.loadLines);

  return function reorder(quotation: ClientQuotation, stayOnPage = false) {
    const lines = draftToCartLines(orderLinesFromQuotation(quotation));
    if (lines.length === 0) {
      toast.error(t('reorderEmpty'));
      return;
    }
    loadLines(lines);
    toast.success(t('reorderAdded'));
    if (!stayOnPage) router.push('/store');
  };
}
