/**
 * Claims API shapes — aligned with Nest ClaimsModule responses.
 */

export type ClaimStatusValue =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled'
  | 'declined'
  | 'deleted'
  | string;

export type ClaimCategoryValue = string;

export interface ClaimOwner {
  uid?: number;
  name?: string;
  surname?: string;
  email?: string;
  clerkUserId?: string;
  phone?: string;
  photoURL?: string;
  accessLevel?: string;
  role?: string;
}

export interface ClaimBranchAddress {
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ClaimBranch {
  uid?: number;
  name?: string;
  contactPerson?: string;
  address?: ClaimBranchAddress | null;
}

export interface ClaimOrganisation {
  uid?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  logo?: string | null;
  clerkOrgId?: string;
  ref?: string;
}

export interface ClaimGroupRef {
  uid: number;
  title: string;
  kind?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Single claim as returned on list/detail (amount may be formatted string). */
export interface Claim {
  uid: number;
  comments?: string;
  comment?: string;
  category?: ClaimCategoryValue;
  documentUrl?: string | null;
  status: ClaimStatusValue;
  currency?: string;
  claimRef?: string | null;
  claimGroupUid?: number | null;
  claimGroup?: ClaimGroupRef | null;
  owner?: ClaimOwner | null;
  branch?: ClaimBranch | null;
  organisation?: ClaimOrganisation | null;
  createdAt?: string;
  updatedAt?: string;
  verifiedAt?: string;
  amount?: number | string;
  isDeleted?: boolean;
}

/** Paginated list — GET /claims */
export interface ClaimsListResponse {
  data?: Claim[];
  message?: string;
  meta?: {
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

/** GET /claims/me */
export interface ClaimsMeResponse {
  message?: string;
  claims: Claim[];
  stats?: {
    total: number;
    pending: number;
    approved: number;
    declined: number;
    paid: number;
  };
}

export interface ClaimDetailResponse {
  message: string;
  claim: Claim | null;
  stats?: unknown;
}

export interface CreateClaimPayload {
  amount: number;
  category: string;
  comment?: string;
  documentUrl?: string;
  currency?: string;
  claimGroupUid?: number;
}

export type UpdateClaimPayload = Partial<{
  status: ClaimStatusValue;
  comment: string;
  amount: number;
  documentUrl: string | null;
  category: ClaimCategoryValue;
  currency: string;
  claimGroupUid: number | null;
}>;

export interface CreateClaimResponse {
  message: string;
  claim: Claim;
}

export interface MessageResponse {
  message: string;
}

export interface ShareTokenResponse {
  message?: string;
  shareToken?: string;
  shareLink?: string;
}

export interface ClaimGroup {
  uid: number;
  title: string;
  kind?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClaimGroupsListResponse {
  message?: string;
  groups: ClaimGroup[];
}

export interface ClaimGroupDetailResponse {
  message?: string;
  group: ClaimGroup;
}

export interface CreateClaimGroupPayload {
  title: string;
  kind?: string;
}

export type UpdateClaimGroupPayload = Partial<{
  title: string;
  kind: string;
}>;

export const CLAIM_CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'travel', label: 'Travel' },
  { value: 'transport', label: 'Transport' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'meals', label: 'Meals' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'other', label: 'Other' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'event', label: 'Event' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'other expenses', label: 'Other expenses' },
] as const;

export const CLAIM_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;
