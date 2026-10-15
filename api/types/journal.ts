/**
 * Merchandise logs are journal rows. Status values match the server enum.
 */

export const JOURNAL_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;

export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export interface JournalOwner {
  uid?: number;
  clerkUserId?: string;
  name?: string;
  surname?: string;
  username?: string;
  email?: string;
  accessLevel?: string;
  photoURL?: string | null;
  avatar?: string | null;
}

export interface JournalAddress {
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface JournalBranch {
  uid?: number;
  name?: string;
  contactPerson?: string;
  address?: JournalAddress | null;
}

export interface JournalOrganisation {
  uid?: number;
  name?: string;
  email?: string;
  phone?: string;
  logo?: string;
}

export interface Journal {
  uid: number;
  clientRef?: string | null;
  fileURL?: string | null;
  /** Extra file URLs stored on the journal row. */
  attachments?: string[] | null;
  comments?: string | null;
  status?: JournalStatus | string | null;
  type?: string | null;
  title?: string | null;
  timestamp?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  isDeleted?: boolean;
  owner?: JournalOwner | null;
  ownerClerkUserId?: string | null;
  branch?: JournalBranch | null;
  organisation?: JournalOrganisation | null;
}

export interface JournalListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JournalListResponse {
  data: Journal[];
  message?: string;
  meta: JournalListMeta;
}

export interface JournalDetailResponse {
  journal: Journal | null;
  message?: string;
}

export interface JournalMessageResponse {
  message?: string;
}

export interface CreateJournalPayload {
  clientRef: string;
  comments: string;
  fileURL: string;
}

export interface UpdateJournalPayload {
  clientRef?: string;
  comments?: string;
  fileURL?: string;
  status?: JournalStatus;
}
