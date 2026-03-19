/**
 * Types for interactions API. Aligned with server Interaction entity and InteractionsService.
 */

export type InteractionType =
  | 'message'
  | 'document'
  | 'task'
  | 'note'
  | 'appointment'
  | 'reminder'
  | 'general'
  | 'sales'
  | 'support'
  | 'followup'
  | 'feedback'
  | 'onboarding'
  | 'email'
  | 'call'
  | 'meeting';

export interface InteractionCreatedBy {
  uid?: number;
  name?: string;
  surname?: string;
  email?: string;
  clerkUserId?: string;
}

export interface InteractionListItem {
  uid: number;
  message: string;
  attachmentUrl?: string | null;
  type?: InteractionType;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: InteractionCreatedBy | null;
  createdByClerkUserId?: string | null;
  leadUid?: number | null;
  clientUid?: number | null;
  organisationUid?: number | null;
  branchUid?: number | null;
}

export interface InteractionsByLeadResponse {
  data: InteractionListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface CreateInteractionPayload {
  message: string;
  attachmentUrl?: string;
  type?: InteractionType;
  leadUid?: number;
  clientUid?: number;
  quotationUid?: number;
}

export interface CreateInteractionResponse {
  message: string;
  data: InteractionListItem | null;
}
