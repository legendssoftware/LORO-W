import type { AxiosInstance } from 'axios';
import type {
  GetPayslipsParams,
  PayslipDocumentResponse,
  PayslipsListResponse,
} from '@/api/types/payslips';

export type { GetPayslipsParams } from '@/api/types/payslips';

export type PayslipsRequestOpts = {
  skipErrorToast?: boolean;
};

/**
 * GET /payslips - list payslips with optional filters.
 */
export async function getPayslips(
  client: AxiosInstance,
  params: GetPayslipsParams = {},
  opts?: PayslipsRequestOpts
): Promise<PayslipsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.status) search.set('status', params.status);
  if (params.userId != null) search.set('userId', String(params.userId));
  if (params.clerkId) search.set('clerkId', params.clerkId);
  const qs = search.toString();
  const { data } = await client.get<PayslipsListResponse>(
    `/payslips${qs ? `?${qs}` : ''}`,
    opts?.skipErrorToast ? { meta: { skipErrorToast: true } } : undefined
  );
  return data;
}

/**
 * GET /payslips/user/:ref - payslips for a specific user (matches APK).
 * `ref` is numeric uid or Clerk user id (user_…).
 */
export async function getUserPayslips(
  client: AxiosInstance,
  userRef: number | string,
  opts?: PayslipsRequestOpts
): Promise<PayslipsListResponse> {
  const { data } = await client.get<PayslipsListResponse>(
    `/payslips/user/${userRef}`,
    opts?.skipErrorToast ? { meta: { skipErrorToast: true } } : undefined
  );
  return data;
}

/**
 * GET /payslips/:id/document - signed download URL for payslip PDF.
 */
export async function getPayslipDocument(
  client: AxiosInstance,
  payslipId: number,
  opts?: PayslipsRequestOpts
): Promise<PayslipDocumentResponse> {
  const { data } = await client.get<PayslipDocumentResponse>(
    `/payslips/${payslipId}/document`,
    opts?.skipErrorToast ? { meta: { skipErrorToast: true } } : undefined
  );
  return data;
}
