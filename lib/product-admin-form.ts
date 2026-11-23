import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BadgePercent,
  Banknote,
  Barcode,
  Boxes,
  Calendar,
  CircleDot,
  Factory,
  FolderTree,
  Hash,
  Layers,
  Link2,
  MapPin,
  Package,
  Palette,
  Percent,
  Ruler,
  Scale,
  Shield,
  Snowflake,
  Star,
  Tag,
  Warehouse,
} from 'lucide-react';
import type { StaffProduct } from '@/api/endpoints/products-admin';

const ERP_CODE_PLACEHOLDER = 'Product Reference Code';

/** ERP imports store the Pastel item code separately from the generated SKU. */
export function isErpCatalogueProduct(product: Pick<StaffProduct, 'productReferenceCode' | 'sku'>): boolean {
  const code = product.productReferenceCode?.trim();
  if (!code || code === ERP_CODE_PLACEHOLDER) return false;
  const sku = product.sku?.trim();
  return !sku || code !== sku;
}

export const PRODUCT_STATUSES: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'active', label: 'Active', icon: CircleDot },
  { value: 'inactive', label: 'Inactive', icon: CircleDot },
  { value: 'hidden', label: 'Hidden', icon: CircleDot },
  { value: 'special', label: 'Special', icon: Star },
  { value: 'new', label: 'New', icon: Package },
  { value: 'discontinued', label: 'Discontinued', icon: CircleDot },
  { value: 'bestseller', label: 'Bestseller', icon: Award },
  { value: 'hotdeals', label: 'Hot deals', icon: BadgePercent },
  { value: 'outofstock', label: 'Out of stock', icon: Boxes },
];

export const PACKAGE_UNITS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'unit', label: 'Unit', icon: Package },
  { value: 'box', label: 'Box', icon: Boxes },
  { value: 'pack', label: 'Pack', icon: Layers },
  { value: 'kg', label: 'Kilogram', icon: Scale },
  { value: 'litre', label: 'Litre', icon: Scale },
  { value: 'each', label: 'Each', icon: Hash },
];

export const WARRANTY_UNITS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'days', label: 'Days', icon: Calendar },
  { value: 'months', label: 'Months', icon: Calendar },
  { value: 'years', label: 'Years', icon: Shield },
];

export interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  status: string;
  imageUrl: string;
  sku: string;
  warehouseLocation: string;
  stockQuantity: string;
  trackStock: boolean;
  productRef: string;
  productReferenceCode: string;
  reorderPoint: string;
  price: string;
  salePrice: string;
  discount: string;
  taxPercent: string;
  barcode: string;
  brand: string;
  packageQuantity: string;
  weight: string;
  isOnPromotion: boolean;
  packageDetails: string;
  promotionStartDate: string;
  promotionEndDate: string;
  packageUnit: string;
  itemsPerPack: string;
  packsPerPallet: string;
  packPrice: string;
  palletPrice: string;
  packWeight: string;
  palletWeight: string;
  palletAvailable: boolean;
  palletStockQuantity: string;
  palletReorderPoint: string;
  palletDiscount: string;
  palletSku: string;
  palletBarcode: string;
  palletSalePrice: string;
  palletOnPromotion: boolean;
  palletPromotionStartDate: string;
  palletPromotionEndDate: string;
  palletDescription: string;
  palletImageUrl: string;
  minimumPalletOrderQuantity: string;
  palletBulkDiscountPercentage: string;
  palletBulkDiscountMinQty: string;
  dimensions: string;
  packDimensions: string;
  palletDimensions: string;
  manufacturer: string;
  model: string;
  color: string;
  material: string;
  warrantyPeriod: string;
  warrantyUnit: string;
  specifications: string;
  features: string;
  rating: string;
  reviewCount: string;
  origin: string;
  isFragile: boolean;
  requiresSpecialHandling: boolean;
  storageConditions: string;
  minimumOrderQuantity: string;
  bulkDiscountPercentage: string;
  bulkDiscountMinQty: string;
}

export type ProductFieldKind = 'text' | 'number' | 'textarea' | 'datetime';

export interface ProductField {
  key: keyof ProductFormValues;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  kind: ProductFieldKind;
}

export const PRODUCT_IDENTITY_FIELDS: ProductField[] = [
  { key: 'name', label: 'Name', placeholder: 'e.g. 2kg braai pack', icon: Tag, kind: 'text' },
  { key: 'description', label: 'Description', placeholder: 'What the customer sees in the store', icon: Package, kind: 'textarea' },
  { key: 'category', label: 'Category', placeholder: 'e.g. Meat', icon: FolderTree, kind: 'text' },
  { key: 'sku', label: 'SKU', placeholder: 'e.g. MEA-BRA-000-100245', icon: Hash, kind: 'text' },
  { key: 'productReferenceCode', label: 'ERP item code', placeholder: 'Pastel item code, leave blank for a LORO product', icon: Link2, kind: 'text' },
  { key: 'barcode', label: 'Barcode', placeholder: 'e.g. 6001234567890', icon: Barcode, kind: 'text' },
  { key: 'brand', label: 'Brand', placeholder: 'e.g. LORO', icon: Award, kind: 'text' },
];

export const PRODUCT_PRICE_FIELDS: ProductField[] = [
  { key: 'price', label: 'Price', placeholder: '0.00', icon: Banknote, kind: 'number' },
  { key: 'salePrice', label: 'Sale price', placeholder: '0.00', icon: BadgePercent, kind: 'number' },
  { key: 'discount', label: 'Discount %', placeholder: '0', icon: Percent, kind: 'number' },
  { key: 'taxPercent', label: 'Tax %', placeholder: '15', icon: Percent, kind: 'number' },
  { key: 'promotionStartDate', label: 'Promotion starts', placeholder: 'Start date', icon: Calendar, kind: 'datetime' },
  { key: 'promotionEndDate', label: 'Promotion ends', placeholder: 'End date', icon: Calendar, kind: 'datetime' },
];

export const PRODUCT_STOCK_FIELDS: ProductField[] = [
  { key: 'stockQuantity', label: 'Stock quantity', placeholder: '0', icon: Boxes, kind: 'number' },
  { key: 'reorderPoint', label: 'Reorder point', placeholder: '10', icon: Warehouse, kind: 'number' },
  { key: 'warehouseLocation', label: 'Warehouse', placeholder: 'e.g. Warehouse A', icon: Warehouse, kind: 'text' },
];

export const PRODUCT_PACK_FIELDS: ProductField[] = [
  { key: 'packageQuantity', label: 'Package quantity', placeholder: '1', icon: Package, kind: 'number' },
  { key: 'packageDetails', label: 'Package details', placeholder: 'e.g. 12 units per box', icon: Boxes, kind: 'text' },
  { key: 'itemsPerPack', label: 'Items per pack', placeholder: '1', icon: Layers, kind: 'number' },
  { key: 'packPrice', label: 'Pack price', placeholder: '0.00', icon: Banknote, kind: 'number' },
  { key: 'packWeight', label: 'Pack weight (kg)', placeholder: '0', icon: Scale, kind: 'number' },
  { key: 'weight', label: 'Item weight (kg)', placeholder: '0', icon: Scale, kind: 'number' },
  { key: 'packDimensions', label: 'Pack dimensions', placeholder: 'L x W x H', icon: Ruler, kind: 'text' },
];

export const PRODUCT_PALLET_FIELDS: ProductField[] = [
  { key: 'packsPerPallet', label: 'Packs per pallet', placeholder: '1', icon: Layers, kind: 'number' },
  { key: 'palletPrice', label: 'Pallet price', placeholder: '0.00', icon: Banknote, kind: 'number' },
  { key: 'palletSalePrice', label: 'Pallet sale price', placeholder: '0.00', icon: BadgePercent, kind: 'number' },
  { key: 'palletWeight', label: 'Pallet weight (kg)', placeholder: '0', icon: Scale, kind: 'number' },
  { key: 'palletStockQuantity', label: 'Pallet stock', placeholder: '0', icon: Boxes, kind: 'number' },
  { key: 'palletReorderPoint', label: 'Pallet reorder point', placeholder: '1', icon: Warehouse, kind: 'number' },
  { key: 'palletDiscount', label: 'Pallet discount %', placeholder: '0', icon: Percent, kind: 'number' },
  { key: 'palletSku', label: 'Pallet SKU', placeholder: 'Generated from the SKU when blank', icon: Hash, kind: 'text' },
  { key: 'palletBarcode', label: 'Pallet barcode', placeholder: 'Optional barcode', icon: Barcode, kind: 'text' },
  { key: 'palletPromotionStartDate', label: 'Pallet promotion starts', placeholder: 'Start date', icon: Calendar, kind: 'datetime' },
  { key: 'palletPromotionEndDate', label: 'Pallet promotion ends', placeholder: 'End date', icon: Calendar, kind: 'datetime' },
  { key: 'palletDescription', label: 'Pallet description', placeholder: 'How the pallet is sold', icon: Package, kind: 'textarea' },
  { key: 'minimumPalletOrderQuantity', label: 'Minimum pallet order', placeholder: '1', icon: Boxes, kind: 'number' },
  { key: 'palletBulkDiscountPercentage', label: 'Pallet bulk discount %', placeholder: '0', icon: Percent, kind: 'number' },
  { key: 'palletBulkDiscountMinQty', label: 'Pallet bulk minimum', placeholder: '3', icon: Layers, kind: 'number' },
  { key: 'palletDimensions', label: 'Pallet dimensions', placeholder: 'L x W x H', icon: Ruler, kind: 'text' },
];

export const PRODUCT_SPEC_FIELDS: ProductField[] = [
  { key: 'dimensions', label: 'Dimensions', placeholder: 'L x W x H', icon: Ruler, kind: 'text' },
  { key: 'manufacturer', label: 'Manufacturer', placeholder: 'e.g. Acme', icon: Factory, kind: 'text' },
  { key: 'model', label: 'Model', placeholder: 'e.g. AC-2024', icon: Hash, kind: 'text' },
  { key: 'color', label: 'Colour', placeholder: 'e.g. Blue', icon: Palette, kind: 'text' },
  { key: 'material', label: 'Material', placeholder: 'e.g. Cardboard', icon: Layers, kind: 'text' },
  { key: 'warrantyPeriod', label: 'Warranty period', placeholder: '12', icon: Shield, kind: 'number' },
  { key: 'specifications', label: 'Specifications', placeholder: 'Power, size, and other specs', icon: Ruler, kind: 'textarea' },
  { key: 'features', label: 'Features', placeholder: 'Comma-separated features', icon: Star, kind: 'textarea' },
  { key: 'rating', label: 'Rating', placeholder: '0 to 5', icon: Star, kind: 'number' },
  { key: 'reviewCount', label: 'Review count', placeholder: '0', icon: Star, kind: 'number' },
  { key: 'origin', label: 'Origin', placeholder: 'e.g. South Africa', icon: MapPin, kind: 'text' },
  { key: 'storageConditions', label: 'Storage', placeholder: 'e.g. Cool and dry', icon: Snowflake, kind: 'text' },
];

export const PRODUCT_ORDER_FIELDS: ProductField[] = [
  { key: 'minimumOrderQuantity', label: 'Minimum order', placeholder: '1', icon: Boxes, kind: 'number' },
  { key: 'bulkDiscountPercentage', label: 'Bulk discount %', placeholder: '0', icon: Percent, kind: 'number' },
  { key: 'bulkDiscountMinQty', label: 'Bulk minimum quantity', placeholder: '10', icon: Layers, kind: 'number' },
];

function text(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function toLocalInput(value: unknown): string {
  if (value == null || value === '') return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Blank form for a new catalogue product. */
export function emptyProductForm(): ProductFormValues {
  return {
    name: '',
    description: '',
    category: '',
    status: 'new',
    imageUrl: '',
    sku: '',
    warehouseLocation: '',
    stockQuantity: '0',
    trackStock: false,
    productRef: '',
    productReferenceCode: '',
    reorderPoint: '10',
    price: '0',
    salePrice: '0',
    discount: '0',
    taxPercent: '0',
    barcode: '',
    brand: '',
    packageQuantity: '1',
    weight: '0',
    isOnPromotion: false,
    packageDetails: '',
    promotionStartDate: '',
    promotionEndDate: '',
    packageUnit: 'unit',
    itemsPerPack: '1',
    packsPerPallet: '1',
    packPrice: '0',
    palletPrice: '0',
    packWeight: '0',
    palletWeight: '0',
    palletAvailable: false,
    palletStockQuantity: '0',
    palletReorderPoint: '1',
    palletDiscount: '0',
    palletSku: '',
    palletBarcode: '',
    palletSalePrice: '0',
    palletOnPromotion: false,
    palletPromotionStartDate: '',
    palletPromotionEndDate: '',
    palletDescription: '',
    palletImageUrl: '',
    minimumPalletOrderQuantity: '1',
    palletBulkDiscountPercentage: '0',
    palletBulkDiscountMinQty: '',
    dimensions: '',
    packDimensions: '',
    palletDimensions: '',
    manufacturer: '',
    model: '',
    color: '',
    material: '',
    warrantyPeriod: '',
    warrantyUnit: 'months',
    specifications: '',
    features: '',
    rating: '0',
    reviewCount: '0',
    origin: '',
    isFragile: false,
    requiresSpecialHandling: false,
    storageConditions: '',
    minimumOrderQuantity: '',
    bulkDiscountPercentage: '0',
    bulkDiscountMinQty: '',
  };
}

/** Map a stored product onto the form, including decimal strings from Postgres. */
export function productToForm(product: StaffProduct): ProductFormValues {
  const blank = emptyProductForm();
  const next = { ...blank };
  (Object.keys(blank) as Array<keyof ProductFormValues>).forEach((key) => {
    const raw = product[key as keyof StaffProduct];
    if (typeof blank[key] === 'boolean') {
      next[key] = Boolean(raw) as never;
      return;
    }
    if (key.endsWith('Date')) {
      next[key] = toLocalInput(raw) as never;
      return;
    }
    if (raw != null) next[key] = text(raw) as never;
  });
  return next;
}

function numberOr(value: string, fallback: number): number {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function slugSku(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'sku-000000';
}

/** Body for POST /products and PATCH /products/:uid. */
export function formToProductPayload(values: ProductFormValues): Record<string, unknown> {
  const sku = values.sku.trim() || slugSku(values.name);
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    category: values.category.trim() || 'Uncategorized',
    status: values.status || 'new',
    imageUrl: values.imageUrl.trim() || undefined,
    sku,
    warehouseLocation: values.warehouseLocation.trim() || undefined,
    stockQuantity: numberOr(values.stockQuantity, 0),
    trackStock: values.trackStock,
    productRef: values.productRef.trim() || undefined,
    productReferenceCode: values.productReferenceCode.trim() || sku,
    reorderPoint: numberOr(values.reorderPoint, 10),
    price: numberOr(values.price, 0),
    salePrice: numberOr(values.salePrice, 0),
    discount: numberOr(values.discount, 0),
    taxPercent: numberOr(values.taxPercent, 0),
    barcode: values.barcode.trim() || sku,
    brand: values.brand.trim() || 'LORO',
    packageQuantity: numberOr(values.packageQuantity, 1),
    weight: numberOr(values.weight, 0),
    isOnPromotion: values.isOnPromotion,
    packageDetails: values.packageDetails.trim() || undefined,
    promotionStartDate: optionalDate(values.promotionStartDate),
    promotionEndDate: optionalDate(values.promotionEndDate),
    packageUnit: values.packageUnit || 'unit',
    itemsPerPack: numberOr(values.itemsPerPack, 1),
    packsPerPallet: numberOr(values.packsPerPallet, 1),
    packPrice: numberOr(values.packPrice, 0),
    palletPrice: numberOr(values.palletPrice, 0),
    packWeight: numberOr(values.packWeight, 0),
    palletWeight: numberOr(values.palletWeight, 0),
    palletAvailable: values.palletAvailable,
    palletStockQuantity: numberOr(values.palletStockQuantity, 0),
    palletReorderPoint: numberOr(values.palletReorderPoint, 1),
    palletDiscount: numberOr(values.palletDiscount, 0),
    palletSku: values.palletSku.trim() || undefined,
    palletBarcode: values.palletBarcode.trim() || undefined,
    palletSalePrice: numberOr(values.palletSalePrice, 0),
    palletOnPromotion: values.palletOnPromotion,
    palletPromotionStartDate: optionalDate(values.palletPromotionStartDate),
    palletPromotionEndDate: optionalDate(values.palletPromotionEndDate),
    palletDescription: values.palletDescription.trim() || undefined,
    palletImageUrl: values.palletImageUrl.trim() || undefined,
    minimumPalletOrderQuantity: numberOr(values.minimumPalletOrderQuantity, 1),
    palletBulkDiscountPercentage: numberOr(values.palletBulkDiscountPercentage, 0),
    palletBulkDiscountMinQty: optionalNumber(values.palletBulkDiscountMinQty),
    dimensions: values.dimensions.trim() || undefined,
    packDimensions: values.packDimensions.trim() || undefined,
    palletDimensions: values.palletDimensions.trim() || undefined,
    manufacturer: values.manufacturer.trim() || undefined,
    model: values.model.trim() || undefined,
    color: values.color.trim() || undefined,
    material: values.material.trim() || undefined,
    warrantyPeriod: optionalNumber(values.warrantyPeriod),
    warrantyUnit: values.warrantyUnit || 'months',
    specifications: values.specifications.trim() || undefined,
    features: values.features.trim() || undefined,
    rating: numberOr(values.rating, 0),
    reviewCount: numberOr(values.reviewCount, 0),
    origin: values.origin.trim() || undefined,
    isFragile: values.isFragile,
    requiresSpecialHandling: values.requiresSpecialHandling,
    storageConditions: values.storageConditions.trim() || undefined,
    minimumOrderQuantity: optionalNumber(values.minimumOrderQuantity),
    bulkDiscountPercentage: numberOr(values.bulkDiscountPercentage, 0),
    bulkDiscountMinQty: optionalNumber(values.bulkDiscountMinQty),
  };
}
