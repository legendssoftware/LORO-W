import type { AxiosInstance } from 'axios';
import type {
  PaginatedTasksResponse,
  TaskDetailResponse,
  TasksForUserResponse,
  GetTasksParams,
  CreateTaskPayload,
  UpdateTaskPayload,
  UpdateSubtaskPayload,
  OptimizedRoute,
  TaskFlagsResponse,
  CreateTaskFlagPayload,
  UpdateTaskFlagPayload,
  UpdateTaskFlagItemPayload,
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
  if (params.isOverdue === true) search.set('isOverdue', 'true');
  if (params.isOverdue === false) search.set('isOverdue', 'false');
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
 * GET /tasks/for/:ref — all tasks for assignee user uid.
 */
export async function getTasksForUser(
  client: AxiosInstance,
  userRef: number
): Promise<TasksForUserResponse> {
  const { data } = await client.get<TasksForUserResponse>(
    `/tasks/for/${userRef}`
  );
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

/**
 * DELETE /tasks/:ref - soft-delete a task.
 */
export async function deleteTask(
  client: AxiosInstance,
  ref: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(`/tasks/${ref}`);
  return data;
}

/**
 * PATCH /tasks/toggle-job-status/:id - toggle job status (QUEUED → RUNNING → COMPLETED).
 */
export async function toggleJobStatus(
  client: AxiosInstance,
  id: number
): Promise<{ message: string; task?: { uid: number; title: string; status: string; jobStatus: string; jobStartTime?: string; jobEndTime?: string; jobDuration?: number } }> {
  const { data } = await client.patch<{ message: string; task?: unknown }>(
    `/tasks/toggle-job-status/${id}`
  );
  return data as { message: string; task?: { uid: number; title: string; status: string; jobStatus: string; jobStartTime?: string; jobEndTime?: string; jobDuration?: number } };
}

/**
 * PATCH /tasks/cancel-job/:id - stop RUNNING job, close segment, reset to QUEUED.
 */
export async function cancelJob(
  client: AxiosInstance,
  id: number
): Promise<{ message: string; task?: { uid: number; title: string; status: string; jobStatus: string; jobStartTime?: string | null; jobEndTime?: string | null; jobDuration?: number | null } }> {
  const { data } = await client.patch<{ message: string; task?: unknown }>(
    `/tasks/cancel-job/${id}`
  );
  return data as {
    message: string;
    task?: {
      uid: number;
      title: string;
      status: string;
      jobStatus: string;
      jobStartTime?: string | null;
      jobEndTime?: string | null;
      jobDuration?: number | null;
    };
  };
}

/**
 * PATCH /tasks/sub-task/complete/:ref - mark a subtask as completed.
 */
export async function completeSubtask(
  client: AxiosInstance,
  ref: number
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/tasks/sub-task/complete/${ref}`
  );
  return data;
}

/**
 * PATCH /tasks/sub-task/:ref - update a subtask.
 */
export async function updateSubtask(
  client: AxiosInstance,
  ref: number,
  payload: UpdateSubtaskPayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/tasks/sub-task/${ref}`,
    payload
  );
  return data;
}

/**
 * DELETE /tasks/sub-task/:ref - soft-delete a subtask.
 */
export async function deleteSubtask(
  client: AxiosInstance,
  ref: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(
    `/tasks/sub-task/${ref}`
  );
  return data;
}

export async function getOptimizedRoutes(
  client: AxiosInstance,
  date?: string
): Promise<OptimizedRoute[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const { data } = await client.get<OptimizedRoute[]>(`/tasks/routes/optimized${qs}`);
  return data;
}

export async function calculateOptimizedRoutes(
  client: AxiosInstance,
  date?: string
): Promise<{ message: string }> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  const { data } = await client.post<{ message: string }>(
    `/tasks/routes/calculate${qs}`
  );
  return data;
}

export async function getTaskFlags(
  client: AxiosInstance,
  taskId: number,
  params?: { page?: number; limit?: number }
): Promise<TaskFlagsResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  const { data } = await client.get<TaskFlagsResponse>(
    `/tasks/${taskId}/flags${qs ? `?${qs}` : ''}`
  );
  return data;
}

export async function createTaskFlag(
  client: AxiosInstance,
  payload: CreateTaskFlagPayload
): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/tasks/flags', payload);
  return data;
}

export async function updateTaskFlag(
  client: AxiosInstance,
  flagId: number,
  payload: UpdateTaskFlagPayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/tasks/flags/${flagId}`,
    payload
  );
  return data;
}

export async function updateTaskFlagItem(
  client: AxiosInstance,
  itemId: number,
  payload: UpdateTaskFlagItemPayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/tasks/flag-items/${itemId}`,
    payload
  );
  return data;
}
