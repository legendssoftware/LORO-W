import type { ClientQuotationItem, ClientQuotationProduct } from '@/api/types/client-portal';
import {
  DEFAULT_PRODUCT_IMAGE_URL,
  getProductDisplayName,
  getProductImageUri,
} from '@/lib/product-display';

export interface ParsedQuotationLineItem {
  id: string | number;
  name: string;
  imageSrc: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  purchaseMode?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asProduct(value: unknown): ClientQuotationProduct | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  return {
    uid: row.uid != null ? Number(row.uid) : undefined,
    name: row.name != null ? String(row.name) : undefined,
    sku: row.sku != null ? String(row.sku) : undefined,
    imageUrl: row.imageUrl != null ? String(row.imageUrl) : undefined,
    image_url: row.image_url != null ? String(row.image_url) : undefined,
    brand: row.brand != null ? String(row.brand) : undefined,
    category: row.category != null ? String(row.category) : undefined,
  };
}

function parseItem(item: unknown): ClientQuotationItem | null {
  const row = asRecord(item);
  if (!row) return null;
  return {
    uid: row.uid != null ? Number(row.uid) : undefined,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    unitPrice: row.unitPrice != null ? Number(row.unitPrice) : undefined,
    totalPrice: row.totalPrice != null ? Number(row.totalPrice) : undefined,
    purchaseMode: row.purchaseMode != null ? String(row.purchaseMode) : undefined,
    itemsPerUnit: row.itemsPerUnit != null ? Number(row.itemsPerUnit) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    product: asProduct(row.product),
  };
}

export function parseQuotationLineItem(
  item: unknown,
  index: number
): ParsedQuotationLineItem {
  const parsed = parseItem(item);
  const row = asRecord(item);
  const product = parsed?.product;
  const rawName =
    product?.name ??
    (row?.name != null ? String(row.name) : undefined) ??
    (row?.productName != null ? String(row.productName) : undefined);

  const quantity = Math.max(1, Number(parsed?.quantity ?? row?.quantity ?? 1) || 1);
  const totalPrice = Number(parsed?.totalPrice ?? row?.totalPrice ?? 0) || 0;
  const unitPrice =
    Number(parsed?.unitPrice ?? row?.unitPrice ?? 0) ||
    (quantity > 0 ? totalPrice / quantity : 0);

  return {
    id: parsed?.uid ?? index,
    name: getProductDisplayName(rawName),
    imageSrc: getProductImageUri(undefined, product),
    quantity,
    unitPrice,
    totalPrice,
    sku: product?.sku,
    purchaseMode: parsed?.purchaseMode,
  };
}

export function parseQuotationLineItems(items: unknown[]): ParsedQuotationLineItem[] {
  return items.map((item, index) => parseQuotationLineItem(item, index));
}

export { DEFAULT_PRODUCT_IMAGE_URL };
