export type AssetCategory = 'IT_EQUIPMENT' | 'VEHICLE' | 'OFFICE' | 'OTHER';

export type VehicleSizeClass =
  | 'compact'
  | 'sedan'
  | 'suv'
  | 'bakkie'
  | 'van'
  | 'other';

export type FuelType = 'petrol' | 'diesel';

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
