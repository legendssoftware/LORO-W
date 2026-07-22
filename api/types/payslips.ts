/**
 * Payslip list and document types aligned with server PayslipsController responses.
 */

export type PayslipStatus = 'GENERATED' | 'SENT' | 'VIEWED';

export interface PayslipListItem {
  uid: number;
  period: string;
  issueDate: string;
  payslipNumber?: string | null;
  netPay?: number | null;
  grossPay?: number | null;
  status: PayslipStatus;
  documentUrl?: string | null;
  documentRef?: number | null;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    uid?: number;
    name?: string;
    surname?: string;
    clerkUserId?: string;
  } | null;
}

export interface PayslipsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PayslipsListResponse {
  data?: PayslipListItem[];
  meta?: PayslipsListMeta;
  message?: string;
}

export interface PayslipDocumentResponse {
  url: string;
  fileName: string;
  mimeType: string;
  message?: string;
}

export interface GetPayslipsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: PayslipStatus | string;
  userId?: number;
  clerkId?: string;
}
