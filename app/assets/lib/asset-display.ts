import type { AssetCategory, AssetRecord } from '@/api/types/asset';

export const ASSET_CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: 'IT_EQUIPMENT', label: 'IT equipment' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'OTHER', label: 'Other' },
];

export function assetCategoryLabel(category?: AssetCategory | null): string {
  return ASSET_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'Other';
}

export function assetTitle(asset: AssetRecord): string {
  const named = asset.displayName?.trim();
  if (named) return named;
  return `${asset.brand ?? ''} ${asset.modelNumber ?? ''}`.trim() || `Asset ${asset.uid}`;
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
