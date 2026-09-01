import type { AxiosInstance } from 'axios';
import type { CallQualityReportParams, CallQualityReportResponse } from '@/api/types/reports-call-quality';

export async function getCallQualityReport(
  client: AxiosInstance,
  params: CallQualityReportParams = {},
): Promise<CallQualityReportResponse> {
  const { data } = await client.get<CallQualityReportResponse>('/reports/call-quality', { params });
  return data;
}
