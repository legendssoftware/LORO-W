import type { AxiosInstance } from 'axios';
import type {
  TaskPlanningReportParams,
  TaskPlanningReportResponse,
} from '@/api/types/reports-task-planning';

export async function getTaskPlanningReport(
  client: AxiosInstance,
  params: TaskPlanningReportParams = {},
): Promise<TaskPlanningReportResponse> {
  const { data } = await client.get<TaskPlanningReportResponse>('/reports/task-planning', { params });
  return data;
}
