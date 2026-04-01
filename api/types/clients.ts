/** Address shape returned by API for client. */
export interface ClientAddress {
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  googleMapsUrl?: string;
}

/** List row from GET /clients. */
export interface ClientListItem {
  uid: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  address?: ClientAddress;
  status?: string;
  category?: string;
  creditLimit?: number | string | null;
  outstandingBalance?: number | string | null;
  [key: string]: unknown;
}

export interface GetClientsResponse {
  data: ClientListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  message?: string;
}

/** Client detail from GET /clients/:ref (entity + computed credit fields'). */
export interface ClientDetail extends ClientListItem {
  description?: string | null;
  utilization?: number;
  availableCredit?: number;
  industry?: string | null;
  type?: string | null;
  assignedSalesRep?: {
    uid?: number;
    name?: string;
    email?: string;
  } | null;
  website?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  priceTier?: string | null;
  preferredContactMethod?: string | null;
  tags?: string[] | null;
}

export interface GetClientResponse {
  message: string;
  client: ClientDetail | null;
}

/** Payload for POST /clients — required core per CreateClientDto. */
export interface CreateClientPayload {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  alternativePhone?: string;
  website?: string;
  description?: string;
  category?: string;
  status?: string;
  assignedSalesRep?: { uid: number };
  creditLimit?: number;
  outstandingBalance?: number;
  industry?: string;
  tags?: string[];
}

/** PATCH /clients/:ref — partial update. */
export type UpdateClientPayload = Partial<CreateClientPayload> & {
  isDeleted?: boolean;
  ref?: string;
};

export interface ClientMutationMessageResponse {
  message: string;
}
