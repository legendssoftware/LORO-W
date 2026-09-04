import type { AxiosInstance } from 'axios';
import type {
  ActivityIntelligenceParams,
  ActivityIntelligenceResponse,
} from '@/api/types/reports-activity-intelligence';

export async function getActivityIntelligence(
  client: AxiosInstance,
  params: ActivityIntelligenceParams = {},
): Promise<ActivityIntelligenceResponse> {
  const { data } = await client.get<ActivityIntelligenceResponse>(
    '/reports/activity-intelligence',
    { params },
  );
  return data;
}
