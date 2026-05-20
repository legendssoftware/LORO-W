/**
 * Client portal profile types (linked-client users). Aligned with GET /clients/me.
 */

export interface ClientAddress {
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientSocialMedia {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface ClientProfileData {
  uid: number;
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  alternativePhone?: string;
  website?: string;
  logo?: string;
  description?: string;
  address?: ClientAddress;
  creditLimit?: number;
  outstandingBalance?: number;
  priceTier?: string;
  discountPercentage?: number;
  paymentTerms?: string;
  preferredContactMethod?: string;
  preferredLanguage?: string;
  industry?: string;
  companySize?: number;
  socialMedia?: ClientSocialMedia;
  lifetimeValue?: number;
  category?: string;
  type?: string;
  status?: string;
  tags?: string[];
  accessLevel?: 'client';
  branch?: {
    uid: number;
    name: string;
    address?: ClientAddress;
    phone?: string;
    email?: string;
  };
  organisation?: {
    uid: number;
    name: string;
    email?: string;
    phone?: string;
  };
  assignedSalesRep?: {
    uid: number;
    name: string;
    surname?: string;
    email?: string;
    phone?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  projects?: ClientProject[];
  quotations?: ClientQuotation[];
  orders?: unknown[];
  customFields?: Record<string, unknown>;
}

export interface UpdateClientProfilePayload {
  contactPerson?: string;
  phone?: string;
  alternativePhone?: string;
  website?: string;
  logo?: string;
  description?: string;
  address?: ClientAddress;
  industry?: string;
  companySize?: number;
  preferredLanguage?: string;
  preferredContactMethod?: string;
  socialMedia?: ClientSocialMedia;
  category?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface ClientQuotation {
  uid: number;
  quotationNumber?: string;
  orderNumber?: string;
  status?: string;
  totalAmount?: number | string;
  createdAt?: string;
  updatedAt?: string;
  isConverted?: boolean;
  isClientPlaced?: boolean;
  title?: string;
  client?: { name?: string; email?: string; phone?: string; uid?: number };
  orders?: unknown[];
  quotationItems?: unknown[];
  totalItems?: number;
  [key: string]: unknown;
}

export interface ClientProject {
  uid: number;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  type?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: string[];
  [key: string]: unknown;
}

export interface CreateClientProjectPayload {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  type?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  images?: string[];
}

export interface CreditLimitExtensionPayload {
  requestedAmount: number;
  reason?: string;
}

export interface GetLinkedClientMeResponse {
  message?: string;
  client: ClientProfileData | null;
}

export interface PatchClientProfileResponse {
  message?: string;
  data?: ClientProfileData;
}
