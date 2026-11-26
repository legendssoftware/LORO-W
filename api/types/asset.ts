export type AssetCategory = 'IT_EQUIPMENT' | 'VEHICLE' | 'OFFICE' | 'OTHER';

export type VehicleSizeClass =
  | 'compact'
  | 'sedan'
  | 'suv'
  | 'bakkie'
  | 'van'
  | 'truck'
  | 'other';

export type FuelType = 'petrol' | 'diesel';

export type VehicleDesignation =
  | 'local_delivery'
  | 'hauling'
  | 'cross_border'
  | 'inter_branch'
  | 'collection'
  | 'other';

export const VEHICLE_DESIGNATION_LABELS: Record<VehicleDesignation, string> = {
  local_delivery: 'Local delivery',
  hauling: 'Hauling',
  cross_border: 'Cross-border',
  inter_branch: 'Inter-branch',
  collection: 'Collection',
  other: 'Other',
};

export interface AssetRecord {
  uid: number;
  category?: AssetCategory;
  displayName?: string | null;
  brand: string;
  serialNumber: string;
  modelNumber: string;
  modelYear?: number | null;
  vehicleSizeClass?: VehicleSizeClass | null;
  fuelType?: FuelType | null;
  ratedKmPerLitre?: number | null;
  tankCapacityLitres?: number | null;
  /** Rated payload capacity in kilograms (delivery trucks). */
  tonnageKg?: number | null;
  /** Operational designation for fleet vehicles (local_delivery, hauling, cross_border, etc.). */
  vehicleDesignation?: VehicleDesignation | null;
  /** Unladen / tare weight in kg. */
  tareWeightKg?: number | null;
  /** Gross vehicle mass (GVM) in kg. */
  grossVehicleMassKg?: number | null;
  /** Usable cargo deck volume in cubic metres. */
  cargoVolumeM3?: number | null;
  /** Maximum standard pallets. */
  maxPalletCapacity?: number | null;
  /** Number of axles. */
  axleCount?: number | null;
  registrationPlate?: string | null;
  purchaseDate?: string;
  hasInsurance?: boolean;
  insuranceProvider?: string | null;
  insuranceExpiryDate?: string | null;
  ownerClerkUserId?: string | null;
  owner?: {
    uid?: number;
    name?: string;
    surname?: string;
    email?: string;
    clerkUserId?: string;
    photoURL?: string | null;
    avatar?: string | null;
  } | null;
  branch?: {
    uid?: number;
    name?: string;
    alias?: string | null;
  } | null;
}

export interface AssetItemResponse {
  message: string;
  asset: AssetRecord;
}

export interface CreateAssetPayload {
  category?: AssetCategory;
  displayName?: string;
  brand: string;
  serialNumber: string;
  modelNumber: string;
  modelYear?: number;
  vehicleSizeClass?: VehicleSizeClass;
  fuelType?: FuelType;
  ratedKmPerLitre?: number;
  tankCapacityLitres?: number;
  tonnageKg?: number;
  vehicleDesignation?: VehicleDesignation;
  tareWeightKg?: number;
  grossVehicleMassKg?: number;
  cargoVolumeM3?: number;
  maxPalletCapacity?: number;
  axleCount?: number;
  registrationPlate?: string;
  purchaseDate: string;
  hasInsurance: boolean;
  insuranceProvider?: string;
  insuranceExpiryDate?: string;
  owner: { uid: string };
  branch: { uid: number };
}

export interface AssetListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  ownerUid?: number;
  branchUid?: number;
  startDate?: string;
  endDate?: string;
}

export interface AssetsByUserResponse {
  message: string;
  assets: AssetRecord[] | null;
  meta?: AssetListMeta;
}

export interface AssetsListResponse {
  message: string;
  assets: AssetRecord[] | null;
  meta?: AssetListMeta;
}

export interface CreateAssetResponse {
  message: string;
  asset: AssetRecord;
}

export type UpdateAssetPayload = Partial<
  Omit<CreateAssetPayload, 'owner' | 'branch'>
> & {
  owner?: { uid: string };
  branch?: { uid: number };
};

export interface UpdateAssetResponse {
  message: string;
}

export interface DeleteAssetResponse {
  message: string;
}
