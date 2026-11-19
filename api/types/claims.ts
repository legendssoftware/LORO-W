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
  /** Clerk user id of the claim owner. Present on list rows even when `owner` is omitted. */
  ownerClerkUserId?: string | null;
  verifiedBy?: ClaimOwner | null;
  branch?: ClaimBranch | null;
  organisation?: ClaimOrganisation | null;
  createdAt?: string;
  updatedAt?: string;
  verifiedAt?: string;
  amount?: number | string;
  amountNumeric?: number;
  amountZar?: number | null;
  fxRate?: number | null;
  fxDate?: string | null;
  fxCode?: string | null;
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
  submittedAt?: string | null;
  claimCount?: number;
  isDraft?: boolean;
}

export interface ClaimGroupsListResponse {
  message?: string;
  groups: ClaimGroup[];
}

export interface ClaimStatusTotal {
  status: string;
  count: number;
  totalZar: number;
}

export interface ClaimGroupTotal {
  claimGroupUid: number | null;
  title: string;
  count: number;
  totalZar: number;
}

export interface ClaimOwnerTotal {
  ownerUid: number | null;
  name: string;
  count: number;
  totalZar: number;
}

export interface ClaimsSummaryResponse {
  totalZar: number;
  unconvertedCount: number;
  byStatus: ClaimStatusTotal[];
  byGroup: ClaimGroupTotal[];
  byOwner: ClaimOwnerTotal[];
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
  { value: 'general', labelKey: 'enums.claims.category.general' },
  { value: 'travel', labelKey: 'enums.claims.category.travel' },
  { value: 'transport', labelKey: 'enums.claims.category.transport' },
  { value: 'transportation', labelKey: 'enums.claims.category.transportation' },
  { value: 'accommodation', labelKey: 'enums.claims.category.accommodation' },
  { value: 'meals', labelKey: 'enums.claims.category.meals' },
  { value: 'entertainment', labelKey: 'enums.claims.category.entertainment' },
  { value: 'hotel', labelKey: 'enums.claims.category.hotel' },
  { value: 'other', labelKey: 'enums.claims.category.other' },
  { value: 'promotion', labelKey: 'enums.claims.category.promotion' },
  { value: 'event', labelKey: 'enums.claims.category.event' },
  { value: 'announcement', labelKey: 'enums.claims.category.announcement' },
  { value: 'other expenses', labelKey: 'enums.claims.category.otherExpenses' },
] as const;

export const CLAIM_STATUS_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'actions.allStatuses' },
  { value: 'pending', labelKey: 'enums.claims.status.pending' },
  { value: 'approved', labelKey: 'enums.claims.status.approved' },
  { value: 'declined', labelKey: 'enums.claims.status.declined' },
  { value: 'rejected', labelKey: 'enums.claims.status.rejected' },
  { value: 'paid', labelKey: 'enums.claims.status.paid' },
  { value: 'cancelled', labelKey: 'enums.claims.status.cancelled' },
] as const;
