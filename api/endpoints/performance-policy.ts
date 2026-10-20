import type { AxiosInstance } from 'axios';
import type {
  CustomerMapResponse,
  MarketIntelStockResponse,
  PerformanceCaseRecord,
  PolicyAcknowledgement,
  PolicyAgreement,
  PolicyExceptionItem,
  PolicyReportFinaliseResponse,
  PolicyReportParams,
  PolicyReportResponse,
  VerificationQueueResponse,
  WeeklyReview,
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

export async function getMyAcknowledgement(client: AxiosInstance): Promise<PolicyAcknowledgement> {
  const { data } = await client.get<PolicyAcknowledgement>('/performance-policy/me/acknowledgement');
  return data;
}

export async function acknowledgePolicy(
  client: AxiosInstance,
  body: { itemsAccepted: string[]; typedName: string },
): Promise<PolicyAcknowledgement> {
  const { data } = await client.post<PolicyAcknowledgement>('/performance-policy/me/acknowledgement', body);
  return data;
}

export async function getMyAgreement(client: AxiosInstance): Promise<PolicyAgreement> {
  const { data } = await client.get<PolicyAgreement>('/performance-policy/me/agreement');
  return data;
}

export async function signMyAgreement(client: AxiosInstance): Promise<PolicyAgreement> {
  const { data } = await client.post<PolicyAgreement>('/performance-policy/me/agreement/sign');
  return data;
}

export async function getUserAgreement(client: AxiosInstance, clerkUserId: string): Promise<PolicyAgreement> {
  const { data } = await client.get<PolicyAgreement>(`/performance-policy/users/${encodeURIComponent(clerkUserId)}/agreement`);
  return data;
}

export async function upsertUserAgreement(
  client: AxiosInstance,
  clerkUserId: string,
  body: { participates: boolean; prr?: number; currency?: string; effectiveDate?: string; witnessTypedName?: string },
): Promise<PolicyAgreement> {
  const { data } = await client.put<PolicyAgreement>(
    `/performance-policy/users/${encodeURIComponent(clerkUserId)}/agreement`,
    body,
  );
  return data;
}

export async function listPolicyExceptions(
  client: AxiosInstance,
  params: { status?: 'pending' | 'approved' | 'rejected' } = {},
): Promise<PolicyExceptionItem[]> {
  const { data } = await client.get<PolicyExceptionItem[]>('/performance-policy/exceptions', { params });
  return data;
}

export async function decidePolicyException(
  client: AxiosInstance,
  uid: number,
  body: { outcome: 'approve' | 'reject'; decision?: string; decisionNote?: string },
): Promise<PolicyExceptionItem> {
  const { data } = await client.patch<PolicyExceptionItem>(`/performance-policy/exceptions/${uid}/decision`, body);
  return data;
}

export async function getCustomerMap(client: AxiosInstance): Promise<CustomerMapResponse> {
  const { data } = await client.get<CustomerMapResponse>('/performance-policy/customer-map');
  return data;
}

export async function getMarketIntelStock(client: AxiosInstance): Promise<MarketIntelStockResponse> {
  const { data } = await client.get<MarketIntelStockResponse>('/performance-policy/market-intel/stock');
  return data;
}

export async function listWeeklyReviews(client: AxiosInstance): Promise<WeeklyReview[]> {
  const { data } = await client.get<WeeklyReview[]>('/performance-policy/reviews');
  return data;
}

export async function createWeeklyReview(
  client: AxiosInstance,
  body: { userClerkUserId: string; weekStart: string },
): Promise<WeeklyReview> {
  const { data } = await client.post<WeeklyReview>('/performance-policy/reviews', body);
  return data;
}

export async function updateWeeklyReview(
  client: AxiosInstance,
  uid: number,
  body: Partial<Pick<WeeklyReview, 'reason' | 'managerComments' | 'supportRequired' | 'requiredImprovement' | 'nextReviewDate'>>,
): Promise<WeeklyReview> {
  const { data } = await client.patch<WeeklyReview>(`/performance-policy/reviews/${uid}`, body);
  return data;
}

export async function signWeeklyReview(
  client: AxiosInstance,
  uid: number,
  role: 'employee' | 'manager',
  body: { typedName: string; employeeComments?: string },
): Promise<WeeklyReview> {
  const { data } = await client.post<WeeklyReview>(`/performance-policy/reviews/${uid}/${role}-sign`, body);
  return data;
}

export async function listPerformanceCases(client: AxiosInstance): Promise<PerformanceCaseRecord[]> {
  const { data } = await client.get<PerformanceCaseRecord[]>('/performance-policy/cases');
  return data;
}

export async function openPerformanceCase(
  client: AxiosInstance,
  body: { userClerkUserId: string; reviewUid?: number; note?: string },
): Promise<PerformanceCaseRecord> {
  const { data } = await client.post<PerformanceCaseRecord>('/performance-policy/cases', body);
  return data;
}

export async function advancePerformanceCase(
  client: AxiosInstance,
  uid: number,
  body: { stage: PerformanceCaseRecord['stage']; note?: string; pip?: NonNullable<PerformanceCaseRecord['pip']> },
): Promise<PerformanceCaseRecord> {
  const { data } = await client.patch<PerformanceCaseRecord>(`/performance-policy/cases/${uid}`, body);
  return data;
}
