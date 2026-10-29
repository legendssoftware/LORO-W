import type { LucideIcon } from 'lucide-react';
import { Armchair, Car, Laptop, Package } from 'lucide-react';
import type { AssetCategory, AssetRecord } from '@/api/types/asset';

export const ASSET_CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: 'IT_EQUIPMENT', label: 'IT equipment' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'OTHER', label: 'Other' },
];

/** Icon for an asset category. Vehicles use a car; unknown categories use a package. */
export function assetCategoryIcon(category?: AssetCategory | null): LucideIcon {
  switch (category) {
    case 'IT_EQUIPMENT':
      return Laptop;
    case 'VEHICLE':
      return Car;
    case 'OFFICE':
      return Armchair;
    case 'OTHER':
      return Package;
    case undefined:
    case null:
      return Package;
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}

export function assetCategoryLabel(category?: AssetCategory | null): string {
  return ASSET_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'Other';
}

export function assetTitle(asset: AssetRecord): string {
  const named = asset.displayName?.trim();
  if (named) return named;
  return `${asset.brand ?? ''} ${asset.modelNumber ?? ''}`.trim() || `Asset ${asset.uid}`;
}

/** True when the signed-in user is the asset owner. Assigned vehicles they do not own return false. */
export function userOwnsAsset(
  asset: AssetRecord,
  actor: { uid?: number | null; clerkUserId?: string | null }
): boolean {
  const clerkUserId = actor.clerkUserId?.trim();
  if (clerkUserId && (asset.ownerClerkUserId === clerkUserId || asset.owner?.clerkUserId === clerkUserId)) {
    return true;
  }
  const uid = Number(actor.uid);
  return Number.isFinite(uid) && uid > 0 && asset.owner?.uid === uid;
}

export function assetOwnerLabel(asset: AssetRecord): string {
  const name = `${asset.owner?.name ?? ''} ${asset.owner?.surname ?? ''}`.trim();
  if (name) return name;
  return asset.owner?.email?.trim() || 'Unassigned';
}

export function assetMatchesSearch(asset: AssetRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const fields = [
    asset.displayName,
    asset.brand,
    asset.modelNumber,
    asset.serialNumber,
    asset.registrationPlate,
    asset.owner?.name,
    asset.owner?.surname,
    asset.owner?.email,
    assetCategoryLabel(asset.category),
  ];
  return fields.some((value) => (value ?? '').toLowerCase().includes(needle));
}
