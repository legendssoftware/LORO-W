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

export interface AssetsByUserResponse {
  message: string;
  assets: AssetRecord[] | null;
}

export interface CreateAssetResponse {
  message: string;
  asset: AssetRecord;
}
