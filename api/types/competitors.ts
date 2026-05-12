import type { ClientAddress } from '@/api/types/clients';

/** Matches server `CompetitorStatus`. */
export type CompetitorStatusValue =
  | 'active'
  | 'inactive'
  | 'acquired'
  | 'bankrupt'
  | 'merged'
  | 'potential'
  | 'watching';

/** Matches server `GeofenceType`. */
export type GeofenceTypeValue = 'none' | 'notify' | 'alert' | 'restricted';

/** Row from GET /competitors `data` array. */
export interface CompetitorListItem {
  uid: number;
  name: string;
  competitorRef?: string | null;
  description?: string | null;
  industry?: string | null;
  threatLevel?: number | null;
  isDirect?: boolean | null;
  status?: CompetitorStatusValue | string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: ClientAddress | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface GetCompetitorsResponse {
  data: CompetitorListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  message?: string;
}

export interface CompetitorDetail extends CompetitorListItem {
  geofenceType?: GeofenceTypeValue | string | null;
  geofenceRadius?: number | null;
  enableGeofence?: boolean | null;
}

export interface GetCompetitorResponse {
  message: string;
  competitor: CompetitorDetail | null;
}

export interface CreateUpdateCompetitorResponse {
  message: string;
  competitor?: CompetitorDetail | null;
}

export interface CompetitorAddressPayload {
  street: string;
  suburb: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  googleMapsUrl?: string;
}

/** POST /competitors — subset aligned with CreateCompetitorDto used by the form. */
export interface CreateCompetitorPayload {
  name: string;
  address: CompetitorAddressPayload;
  description?: string;
  website?: string;
  landingPage?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  status?: CompetitorStatusValue;
  industry?: string;
  threatLevel?: number;
  isDirect?: boolean;
  latitude?: number;
  longitude?: number;
  geofenceType?: GeofenceTypeValue;
  geofenceRadius?: number;
  enableGeofence?: boolean;
}

export type UpdateCompetitorPayload = Partial<CreateCompetitorPayload>;

export interface CompetitorDeleteResponse {
  message: string;
}
