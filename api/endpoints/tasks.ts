import type { AxiosInstance } from 'axios';
import type {
  PaginatedTasksResponse,
  TaskDetailResponse,
  GetTasksParams,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '@/api/types/tasks';

/**
 * GET /tasks - paginated list of tasks with optional filters.
 */
export async function getTasks(
  client: AxiosInstance,
  params: GetTasksParams = {}
): Promise<PaginatedTasksResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.priority) search.set('priority', params.priority);
  if (params.assigneeId != null) search.set('assigneeId', String(params.assigneeId));
  if (params.clientId != null) search.set('clientId', String(params.clientId));
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.isOverdue != null) search.set('isOverdue', String(params.isOverdue));
  const qs = search.toString();
  const { data } = await client.get<PaginatedTasksResponse>(`/tasks${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /tasks/:ref - single task by reference.
 */
export async function getTask(
  client: AxiosInstance,
  ref: number
): Promise<TaskDetailResponse> {
  const { data } = await client.get<TaskDetailResponse>(`/tasks/${ref}`);
  return data;
}

/**
 * POST /tasks - create a new task.
 */
export async function createTask(
  client: AxiosInstance,
  payload: CreateTaskPayload
): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/tasks', payload);
  return data;
}

/**
 * PATCH /tasks/:ref - update an existing task.
 */
export async function updateTask(
  client: AxiosInstance,
  ref: number,
  payload: UpdateTaskPayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/tasks/${ref}`, payload);
  return data;
}
