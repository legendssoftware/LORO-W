/**
 * Types for visits (check-ins) flow and API.
 */

export type MethodOfContact = 'Physical' | 'Telephone' | 'Email' | 'Whatsapp';

export interface CreateCheckInPayload {
  checkInTime: string;
  checkInLocation: string;
  checkInPhoto?: string | null;
  methodOfContact?: MethodOfContact;
  client?: { uid: number };
  notes?: string;
  contactFullName?: string;
  contactCellPhone?: string;
  contactLandline?: string;
  companyName?: string;
  [key: string]: unknown;
}

export interface CreateCheckOutPayload {
  checkOutTime: string;
  checkOutLocation: string;
  checkOutPhoto?: string | null;
  client?: { uid: number };
  notes?: string;
  resolution?: string;
  followUp?: string;
  contactFullName?: string;
  contactImage?: string;
  contactCellPhone?: string;
  contactLandline?: string;
  contactEmail?: string;
  contactAddress?: {
    streetNumber?: string;
    street?: string;
    suburb?: string;
    city?: string;
    province?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  companyName?: string;
  personSeenPosition?: string;
  meetingLink?: string;
  salesValue?: number;
  salesCurrency?: string;
  quotationNumber?: string;
  quotationUid?: number;
  quotationStatus?: string;
  methodOfContact?: string;
  buildingType?: string;
  businessType?: string;
  contactMade?: boolean;
  media?: string[];
  clientProfileUpdate?: {
    name?: string;
    phone?: string;
    alternativePhone?: string;
    email?: string;
    address?: {
      street?: string;
      suburb?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
  };
  [key: string]: unknown;
}

export interface UpdateVisitDetailsPayload {
  checkInId: number;
  client?: { uid: number };
  notes?: string;
  resolution?: string;
  followUp?: string;
  contactFullName?: string;
  contactImage?: string;
  contactCellPhone?: string;
  contactLandline?: string;
  contactEmail?: string;
  contactAddress?: {
    streetNumber?: string;
    street?: string;
    suburb?: string;
    city?: string;
    province?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  companyName?: string;
  businessType?: string;
  personSeenPosition?: string;
  meetingLink?: string;
  salesValue?: number;
  salesCurrency?: string;
  quotationNumber?: string;
  quotationUid?: number;
  quotationStatus?: string;
  methodOfContact?: string;
  buildingType?: string;
  contactMade?: boolean;
  media?: string[];
  /** Lead UID to link this visit to (e.g. after converting visit to lead). */
  leadUid?: number;
}

export interface CheckInStatusResponse {
  message: string;
  nextAction: 'checkOut' | 'Check In';
  checkedIn: boolean;
  uid?: number;
  checkInTime?: string;
  checkOutTime?: string | null;
  [key: string]: unknown;
}

export interface CheckInResponse {
  message: string;
  checkInId?: number;
}

export interface CheckOutResponse {
  message: string;
  duration?: string;
  checkInId?: number;
}

export interface VisitListItem {
  uid: number;
  checkInTime: string;
  checkOutTime?: string | null;
  duration?: string | null;
  /** Check-in location; when captured via geolocation this is "lat,lng" (e.g. "-26.2041,28.0473"). */
  checkInLocation?: string;
  /** Check-out location; when captured via geolocation this is "lat,lng". */
  checkOutLocation?: string | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  methodOfContact?: string | null;
  notes?: string | null;
  resolution?: string | null;
  contactFullName?: string | null;
  companyName?: string | null;
  client?: { uid: number; name?: string } | null;
  owner?: { name?: string } | null;
  /** Sales value for the visit (for day metrics aggregation). */
  salesValue?: number | null;
  /** Site type: office, shop, etc. (for time breakdown: client vs office). */
  buildingType?: string | null;
  [key: string]: unknown;
}

export interface UseCheckInsParams {
  startDate?: string;
  endDate?: string;
  userUid?: string;
  branchId?: number;
}

export interface UseCheckInsResult {
  data?: { message: string; checkIns: VisitListItem[] };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
