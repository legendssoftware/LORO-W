import type { AxiosInstance } from 'axios';
import type {
  LeadActivityReportParams,
  LeadActivityReportResponse,
} from '@/api/types/reports-lead-activity';

export async function getLeadActivityReport(
  client: AxiosInstance,
  params: LeadActivityReportParams,
): Promise<LeadActivityReportResponse> {
  const { data } = await client.get<LeadActivityReportResponse>('/reports/lead-activity', { params });
  return data;
}
