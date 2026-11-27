import type { ClientQuotation, ClientQuotationItem } from '@/api/types/client-portal';
import type { CartLine, PurchaseMode } from '@/store/client-cart-store';

/** Statuses the server refuses to edit. Mirrors ShopService.canEditQuotation. */
const NON_EDITABLE_ORDER_STATUSES = new Set([
  'sourcing',
  'packing',
  'in_fulfillment',
  'paid',
  'outfordelivery',
  'delivered',
  'completed',
  'cancelled',
]);

/** Statuses allowed to move to cancelled. Mirrors ShopService.isValidStatusTransition. */
const CANCELLABLE_ORDER_STATUSES = new Set([
  'draft',
  'pending_internal',
  'pending_client',
  'negotiation',
  'approved',
  'sourcing',
  'packing',
  'in_fulfillment',
  'paid',
  'outfordelivery',
  'delivered',
  'returned',
  'pending',
  'inprogress',
]);

export interface OrderLineDraft {
  productUid: number;
  name: string;
  sku?: string;
  imageSrc?: string;
  quantity: number;
  unitPrice: number;
  purchaseMode: PurchaseMode;
  itemsPerUnit: number;
}

function normalizeStatus(status?: string): string {
  return (status ?? '').trim().toLowerCase();
}

/** True while the client may still change lines, delivery, and promo. */
export function canClientEditOrder(status?: string): boolean {
  const normalized = normalizeStatus(status);
  if (!normalized) return true;
  return !NON_EDITABLE_ORDER_STATUSES.has(normalized);
}

/** True while the client may cancel this order. */
export function canClientCancelOrder(status?: string): boolean {
  return CANCELLABLE_ORDER_STATUSES.has(normalizeStatus(status));
}

/** Client-placed orders, newest first. */
export function clientPlacedOrders(quotations?: ClientQuotation[]): ClientQuotation[] {
  return (quotations ?? [])
    .filter((quotation) => quotation.isClientPlaced)
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export function orderTitle(quotation: ClientQuotation): string {
  return (
    quotation.quotationNumber ??
    quotation.orderNumber ??
    quotation.title ??
    `Order #${quotation.uid}`
  );
}

function asPurchaseMode(value?: string): PurchaseMode {
  if (value === 'box' || value === 'palette') return value;
  return 'item';
}

function lineFromItem(item: ClientQuotationItem): OrderLineDraft | null {
  const productUid = item.product?.uid;
  if (productUid == null || !Number.isFinite(productUid)) return null;
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const totalPrice = Number(item.totalPrice) || 0;
  const unitPrice = Number(item.unitPrice) || (quantity > 0 ? totalPrice / quantity : 0);
  return {
    productUid,
    name: item.product?.name?.trim() || 'Product',
    sku: item.product?.sku,
    imageSrc: item.product?.imageUrl || item.product?.image_url,
    quantity,
    unitPrice,
    purchaseMode: asPurchaseMode(item.purchaseMode),
    itemsPerUnit: Math.max(1, Number(item.itemsPerUnit) || 1),
  };
}

export function orderLinesFromQuotation(quotation: ClientQuotation): OrderLineDraft[] {
  if (!Array.isArray(quotation.quotationItems)) return [];
  return quotation.quotationItems.flatMap((item) => {
    const line = lineFromItem(item);
    return line ? [line] : [];
  });
}

export function lineTotal(line: OrderLineDraft): number {
  return Number((line.quantity * line.unitPrice).toFixed(2));
}

export function draftToCartLines(lines: OrderLineDraft[]): CartLine[] {
  return lines.map((line) => ({
    uid: line.productUid,
    name: line.name,
    sku: line.sku,
    imageUrl: line.imageSrc,
    quantity: line.quantity,
    purchaseMode: line.purchaseMode,
    unitPrice: line.unitPrice,
    itemsPerUnit: line.itemsPerUnit,
    totalPrice: lineTotal(line),
  }));
}

export function orderMatchesQuery(quotation: ClientQuotation, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    quotation.quotationNumber,
    quotation.orderNumber,
    quotation.title,
    quotation.status,
    orderTitle(quotation),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}
