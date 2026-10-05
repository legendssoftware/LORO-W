import type { AxiosInstance } from 'axios';
import type {
  PolicyReportFinaliseResponse,
  PolicyReportParams,
  PolicyReportResponse,
  VerificationQueueResponse,
} from '@/api/types/performance-policy';

const REPORT_TIMEOUT_MS = 120_000;

/** GET /performance-policy/report: one flat scored row per user for a month or custom window. */
export async function getPolicyReport(
  client: AxiosInstance,
  params: PolicyReportParams,
): Promise<PolicyReportResponse> {
  const { data } = await client.get<PolicyReportResponse>('/performance-policy/report', {
    params,
    timeout: REPORT_TIMEOUT_MS,
  });
  return data;
}

/** GET /performance-policy/report/export: same filters, CSV text (paging ignored). */
export async function exportPolicyReportCsv(
  client: AxiosInstance,
  params: PolicyReportParams,
): Promise<string> {
  const { data } = await client.get<string>('/performance-policy/report/export', {
    params,
    responseType: 'text',
    timeout: REPORT_TIMEOUT_MS,
  });
  return data;
}

/** POST /performance-policy/report/finalise: freeze a closed month (org-wide roles only). */
export async function finalisePolicyMonth(
  client: AxiosInstance,
  month: string,
): Promise<PolicyReportFinaliseResponse> {
  const { data } = await client.post<PolicyReportFinaliseResponse>(
    '/performance-policy/report/finalise',
    { month },
    { timeout: REPORT_TIMEOUT_MS },
  );
  return data;
}

/** GET /performance-policy/verification-queue: flagged and incomplete visits for managers. */
export async function getVerificationQueue(
  client: AxiosInstance,
  params: { range?: 'week' | 'month' | 'today' } = { range: 'week' },
): Promise<VerificationQueueResponse> {
  const { data } = await client.get<VerificationQueueResponse>('/performance-policy/verification-queue', {
    params,
  });
  return data;
}
