/**
 * Types for tasks API responses and params.
 * Aligned with server tasks controller and TasksService.
 * Form options with icons (status, priority, type, repetition) are in @/lib/task-form-utils.
 */

export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
  POSTPONED: 'POSTPONED',
  MISSED: 'MISSED',
} as const;

export type TaskStatusValue = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriorityValue = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskType = {
  IN_PERSON_MEETING: 'IN_PERSON_MEETING',
  VIRTUAL_MEETING: 'VIRTUAL_MEETING',
  CALL: 'CALL',
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
  FOLLOW_UP: 'FOLLOW_UP',
  PROPOSAL: 'PROPOSAL',
  REPORT: 'REPORT',
  QUOTATION: 'QUOTATION',
  VISIT: 'VISIT',
  OTHER: 'OTHER',
} as const;

export type TaskTypeValue = (typeof TaskType)[keyof typeof TaskType];

export interface TaskAssignee {
  clerkUserId?: string;
  uid?: number;
  name?: string;
  surname?: string;
  email?: string;
  photoURL?: string | null;
  avatar?: string | null;
}

export interface TaskClient {
  uid: number;
  name?: string;
  email?: string;
  contactPerson?: string;
}

export interface TaskSubtask {
  uid?: number;
  title: string;
  description: string;
  status?: string;
  isDeleted?: boolean;
}

/** Payload for PATCH /tasks/sub-task/:ref */
export interface UpdateSubtaskPayload {
  title?: string;
  description?: string;
  status?: string;
  isDeleted?: boolean;
}

export interface Task {
  uid: number;
  title: string;
  description: string;
  status: TaskStatusValue;
  taskType: TaskTypeValue;
  priority: TaskPriorityValue;
  progress?: number;
  deadline?: string | null;
  completionDate?: string | null;
  isOverdue?: boolean;
  createdAt?: string;
  updatedAt?: string;
  creator?: {
    uid?: number;
    name?: string;
    surname?: string;
    email?: string;
    photoURL?: string | null;
    avatar?: string | null;
  };
  assignees?: TaskAssignee[];
  clients?: TaskClient[];
  subtasks?: TaskSubtask[];
  attachments?: string[];
  repetitionType?: string;
  repetitionDeadline?: string | null;
  targetCategory?: string;
  comment?: string;
  /** Job lifecycle: QUEUED → RUNNING → COMPLETED */
  jobStatus?: 'QUEUED' | 'RUNNING' | 'COMPLETED';
  jobStartTime?: string | null;
  jobEndTime?: string | null;
  jobDuration?: number | null;
  repetitionSeriesId?: string | null;
  repetitionSequence?: number | null;
  jobSegments?: TaskJobSegmentDto[];
}

export interface TaskJobSegmentDto {
  uid: number;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  clerkUserId: string;
  checkInUid: number | null;
}

export interface PaginatedTasksResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface TaskDetailResponse {
  task: Task | null;
  message: string;
}

/** GET /tasks/for/:ref — tasks assigned to a user (no pagination). */
export interface TasksForUserResponse {
  tasks: Task[];
  message: string;
}

export interface GetTasksParams {
  page?: number;
  limit?: number;
  status?: TaskStatusValue;
  priority?: TaskPriorityValue;
  assigneeId?: number;
  clientId?: number;
  startDate?: string;
  endDate?: string;
  isOverdue?: boolean;
}

export interface AssigneePayload {
  uid: number;
}

export interface ClientPayload {
  uid: number;
  name?: string;
  email?: string;
  contactPerson?: string;
}

export interface SubtaskPayload {
  title: string;
  description: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  taskType: TaskTypeValue;
  priority: TaskPriorityValue;
  deadline?: string;
  repetitionType?: string;
  repetitionDeadline?: string;
  assignees?: AssigneePayload[];
  client?: ClientPayload[];
  subtasks?: SubtaskPayload[];
  attachments?: string[];
  targetCategory?: string;
  comment?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatusValue;
  taskType?: TaskTypeValue;
  priority?: TaskPriorityValue;
  deadline?: string;
  progress?: number;
  completionDate?: string;
  assignees?: AssigneePayload[];
  clients?: ClientPayload[];
  subtasks?: SubtaskPayload[];
  attachments?: string[];
  repetitionType?: string;
  repetitionDeadline?: string;
  targetCategory?: string;
  comment?: string;
}
