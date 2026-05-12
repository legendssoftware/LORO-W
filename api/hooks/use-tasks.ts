'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getTasks,
  getTask,
  getTasksForUser,
  createTask,
  updateTask,
  deleteTask,
  toggleJobStatus,
  completeSubtask,
  updateSubtask,
  deleteSubtask,
} from '@/api/endpoints/tasks';
import type {
  GetTasksParams,
  CreateTaskPayload,
  UpdateTaskPayload,
  UpdateSubtaskPayload,
} from '@/api/types/tasks';

/** Query key prefix for tasks list. Use for invalidateQueries after create/update. */
export const TASKS_LIST_QUERY_KEY = ['tasks'] as const;

/**
 * Fetches paginated tasks list with optional filters.
 */
export function useTasks(
  params: GetTasksParams = {},
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TASKS_LIST_QUERY_KEY, 'list', params],
    queryFn: async () => getTasks(client, params),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches a single task by reference.
 */
export function useTask(
  ref: number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TASKS_LIST_QUERY_KEY, 'detail', ref ?? 'none'],
    queryFn: async () => getTask(client, ref!),
    enabled: (options?.enabled !== false) && ref != null && ref > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * GET /tasks/for/:ref — tasks assigned to user (org-scoped on server).
 */
export function useTasksForUser(
  userRef: number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TASKS_LIST_QUERY_KEY, 'for-user', userRef ?? 'none'],
    queryFn: async () => getTasksForUser(client, userRef!),
    enabled:
      (options?.enabled !== false) &&
      userRef != null &&
      userRef > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to create a new task.
 */
export function useCreateTaskMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(client, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
    },
  });
}

/**
 * Mutation to update an existing task.
 */
export function useUpdateTaskMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ref,
      payload,
    }: { ref: number; payload: UpdateTaskPayload }) =>
      updateTask(client, ref, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...TASKS_LIST_QUERY_KEY, 'detail', variables.ref],
      });
    },
  });
}

/**
 * Mutation to delete a task.
 */
export function useDeleteTaskMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => deleteTask(client, ref),
    onSuccess: (_, ref) => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
      queryClient.removeQueries({ queryKey: [...TASKS_LIST_QUERY_KEY, 'detail', ref] });
    },
  });
}

/**
 * Mutation to toggle job status (QUEUED → RUNNING → COMPLETED).
 */
export function useToggleJobStatusMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toggleJobStatus(client, id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
      const detailRef = data?.task?.uid ?? id;
      queryClient.invalidateQueries({
        queryKey: [...TASKS_LIST_QUERY_KEY, 'detail', detailRef],
      });
    },
  });
}

/**
 * Mutation to mark a subtask as completed.
 */
export function useCompleteSubtaskMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => completeSubtask(client, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TASKS_LIST_QUERY_KEY, 'detail'] });
    },
  });
}

/**
 * Mutation to update a subtask.
 */
export function useUpdateSubtaskMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ref,
      payload,
    }: { ref: number; payload: UpdateSubtaskPayload }) =>
      updateSubtask(client, ref, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TASKS_LIST_QUERY_KEY, 'detail'] });
    },
  });
}

/**
 * Mutation to delete a subtask.
 */
export function useDeleteSubtaskMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => deleteSubtask(client, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TASKS_LIST_QUERY_KEY, 'detail'] });
    },
  });
}
