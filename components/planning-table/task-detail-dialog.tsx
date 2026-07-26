'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Task } from '@/api/types/tasks';
import type { UpdateTaskPayload, SubtaskPayload } from '@/api/types/tasks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DetailSectionHeading,
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  Pencil,
  Plus,
  Play,
  Square,
  CheckCircle2,
  Trash2,
  ClipboardList,
  AlignLeft,
  Users,
  Building2,
  User,
  FileText,
  BadgeCheck,
  ListOrdered,
  Layers,
  CalendarClock,
  Percent,
  CalendarCheck2,
  Repeat,
  FolderOpen,
  Cpu,
  Timer,
  LogIn,
  LogOut,
  MessageSquare,
  ListTodo,
  Paperclip,
  Ban,
} from 'lucide-react';
import { Loader2Icon, XIcon, CalendarIcon } from '@/lib/icons';
import {
  useTask,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useToggleJobStatusMutation,
  useCancelJobMutation,
  useCompleteSubtaskMutation,
  useDeleteSubtaskMutation,
  useUpdateSubtaskMutation,
  useSearchableUsersList,
  useClients,
  useBranches,
} from '@/api/hooks';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  REPETITION_TYPE_OPTIONS,
} from '@/lib/task-form-utils';
import { TaskFlagsSection } from './task-flags-section';
import {
  formatDeadline,
  formatClients,
  formatCompletionDate,
  formatJobDurationDisplay,
  resolveAssigneeProfile,
  resolveCreatorProfile,
} from './planning-table-utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  PlanningAssigneesMultiSelectPanel,
  PlanningClientsMultiSelectPanel,
} from '@/app/planning/components/planning-task-multi-select-panels';

const MODAL_SELECT_TRIGGER =
  'h-9 w-full border-border bg-background text-foreground';

type EditSubtaskRow = SubtaskPayload & { uid?: number };

type TaskEditForm = Partial<Omit<UpdateTaskPayload, 'subtasks'>> & {
  subtasks?: EditSubtaskRow[];
};

function taskToEditForm(
  task: Task,
  users: Array<{ uid: number; clerkUserId?: string }>
): TaskEditForm {
  const assigneeUids = (task.assignees ?? [])
    .map((a) => {
      if (a.uid != null) return a.uid;
      if (a.clerkUserId) {
        const u = users.find((u) => u.clerkUserId === a.clerkUserId);
        return u?.uid;
      }
      return null;
    })
    .filter((uid): uid is number => uid != null);
  const repDeadline = task.repetitionDeadline;
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    taskType: task.taskType,
    deadline: task.deadline ?? undefined,
    progress: task.progress ?? 0,
    assignees: assigneeUids.length > 0 ? assigneeUids.map((uid) => ({ uid })) : undefined,
    clients: (task.clients ?? []).map((c) => ({ uid: c.uid })),
    repetitionType: task.repetitionType ?? 'NONE',
    repetitionDeadline: repDeadline
      ? typeof repDeadline === 'string' && /^\d{4}-\d{2}-\d{2}/.test(repDeadline)
        ? repDeadline
        : format(new Date(repDeadline), 'yyyy-MM-dd')
      : undefined,
    targetCategory: task.targetCategory ?? undefined,
    comment: task.comment ?? undefined,
    subtasks: (task.subtasks ?? [])
      .filter((s) => !s.isDeleted)
      .map((s) => ({
        uid: s.uid,
        title: s.title,
        description: s.description ?? '',
      })),
    attachments: task.attachments ?? undefined,
  };
}

export interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TaskEditForm>({});
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  const [repetitionDeadlinePickerOpen, setRepetitionDeadlinePickerOpen] =
    useState(false);
  const [assigneesPopoverOpen, setAssigneesPopoverOpen] = useState(false);
  const [clientsPopoverOpen, setClientsPopoverOpen] = useState(false);
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState(false);
  const [cancelJobConfirmOpen, setCancelJobConfirmOpen] = useState(false);
  const [deleteSubtaskRef, setDeleteSubtaskRef] = useState<number | null>(null);
  const [jobDurationTick, setJobDurationTick] = useState(0);

  const taskRef = task?.uid ?? null;
  const taskQuery = useTask(taskRef, { enabled: open && !!taskRef });
  const taskFromApi = taskQuery.data?.task ?? null;
  const displayTask: Task | null = taskFromApi ?? task ?? null;

  const updateMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const toggleJobMutation = useToggleJobStatusMutation();
  const cancelJobMutation = useCancelJobMutation();
  const completeSubtaskMutation = useCompleteSubtaskMutation();
  const deleteSubtaskMutation = useDeleteSubtaskMutation();
  const updateSubtaskMutation = useUpdateSubtaskMutation();
  const {
    users,
    searchQuery: assigneeSearchQuery,
    setSearchQuery: setAssigneeSearchQuery,
    isSearchLoading: isAssigneeSearchLoading,
    rememberUser,
  } = useSearchableUsersList({ page: 1, limit: 100, enabled: open });
  const { data: clientsList = [] } = useClients({
    page: 1,
    limit: 100,
    enabled: open,
  });
  const { data: branches = [] } = useBranches({ enabled: open });

  useEffect(() => {
    if (!displayTask || !open) return;
    setEditForm(taskToEditForm(displayTask, users));
    setIsEditing(false);
  }, [displayTask?.uid, open, users]);

  useEffect(() => {
    if (!open || displayTask?.jobStatus !== 'RUNNING' || !displayTask?.jobStartTime) {
      return;
    }
    const id = window.setInterval(() => {
      setJobDurationTick((n) => n + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [open, displayTask?.uid, displayTask?.jobStatus, displayTask?.jobStartTime]);

  const handleCancelEdit = () => {
    if (displayTask) setEditForm(taskToEditForm(displayTask, users));
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!displayTask) return;
    const title = editForm.title?.trim() ?? '';
    const description = editForm.description?.trim() ?? '';
    if (!title) {
      toast.error('Title is required');
      return;
    }
    if (!description) {
      toast.error('Description is required');
      return;
    }
    const deadline =
      typeof editForm.deadline === 'string' ? editForm.deadline.trim() : '';
    if (!deadline) {
      toast.error('Deadline is required');
      return;
    }
    const repType = editForm.repetitionType ?? 'NONE';
    if (repType !== 'NONE') {
      const repEnd = editForm.repetitionDeadline?.trim() ?? '';
      if (!repEnd) {
        toast.error('Repetition end date is required');
        return;
      }
    }
    const editSubs = editForm.subtasks ?? [];
    const originalSubs = (displayTask.subtasks ?? []).filter(
      (s) => !s.isDeleted && s.uid != null
    );

    const editUids = new Set(
      editSubs.map((s) => s.uid).filter((x): x is number => x != null)
    );
    const removed = originalSubs.filter((s) => s.uid != null && !editUids.has(s.uid));
    const added = editSubs.filter((s) => !s.uid && s.title?.trim());

    const payload: UpdateTaskPayload = {
      ...editForm,
      title,
      description,
      deadline,
    };
    delete payload.subtasks;

    if (payload.repetitionType === 'NONE') {
      delete payload.repetitionDeadline;
    }
    if (payload.attachments?.length === 0) {
      delete payload.attachments;
    }

    if (added.length > 0) {
      payload.subtasks = editSubs
        .filter((s) => s.title?.trim())
        .map((s) => ({
          title: s.title.trim(),
          description: s.description?.trim() ?? '',
        }));
    }

    try {
      await updateMutation.mutateAsync({ ref: displayTask.uid, payload });

      if (added.length === 0) {
        for (const s of removed) {
          if (s.uid != null) {
            await deleteSubtaskMutation.mutateAsync(s.uid);
          }
        }
        for (const row of editSubs) {
          if (!row.uid || !row.title?.trim()) continue;
          const orig = originalSubs.find((o) => o.uid === row.uid);
          if (!orig) continue;
          const nextTitle = row.title.trim();
          const nextDesc = row.description?.trim() ?? '';
          if (orig.title === nextTitle && (orig.description ?? '') === nextDesc) {
            continue;
          }
          await updateSubtaskMutation.mutateAsync({
            ref: row.uid,
            payload: { title: nextTitle, description: nextDesc },
          });
        }
      }

      toast.success('Task updated');
      setIsEditing(false);
      await taskQuery.refetch();
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update task');
    }
  };

  const handleToggleJobStatus = async () => {
    if (!displayTask) return;
    try {
      await toggleJobMutation.mutateAsync(displayTask.uid);
      toast.success('Job status updated');
      await taskQuery.refetch();
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update job status');
    }
  };

  const handleCancelJob = async () => {
    if (!displayTask) return;
    try {
      await cancelJobMutation.mutateAsync(displayTask.uid);
      toast.success('Job cancelled');
      setCancelJobConfirmOpen(false);
      await taskQuery.refetch();
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel job');
    }
  };

  const handleDeleteTask = async () => {
    if (!displayTask) return;
    try {
      await deleteTaskMutation.mutateAsync(displayTask.uid);
      toast.success('Task deleted');
      setDeleteTaskConfirmOpen(false);
      onOpenChange(false);
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete task');
    }
  };

  const handleCompleteSubtask = async (subtaskUid: number) => {
    try {
      await completeSubtaskMutation.mutateAsync(subtaskUid);
      toast.success('Subtask completed');
      await taskQuery.refetch();
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete subtask');
    }
  };

  const handleDeleteSubtask = async () => {
    if (deleteSubtaskRef == null) return;
    try {
      await deleteSubtaskMutation.mutateAsync(deleteSubtaskRef);
      toast.success('Subtask removed');
      setDeleteSubtaskRef(null);
      await taskQuery.refetch();
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove subtask');
      setDeleteSubtaskRef(null);
    }
  };

  const toggleAssignee = (uid: number) => {
    const current = editForm.assignees ?? [];
    const has = current.some((a) => a.uid === uid);
    if (!has) {
      const u = users.find((x) => x.uid === uid);
      if (u) rememberUser(u);
    }
    setEditForm((f) => ({
      ...f,
      assignees: has
        ? current.filter((a) => a.uid !== uid)
        : [...current, { uid }],
    }));
  };

  const toggleClient = (uid: number) => {
    const current = editForm.clients ?? [];
    const has = current.some((c) => c.uid === uid);
    setEditForm((f) => ({
      ...f,
      clients: has ? current.filter((c) => c.uid !== uid) : [...current, { uid }],
    }));
  };

  const addSubtask = () => {
    setEditForm((f) => ({
      ...f,
      subtasks: [...(f.subtasks ?? []), { title: '', description: '' }],
    }));
  };

  const removeSubtask = (idx: number) => {
    setEditForm((f) => ({
      ...f,
      subtasks: (f.subtasks ?? []).filter((_, i) => i !== idx),
    }));
  };

  const updateSubtask = (
    idx: number,
    field: keyof SubtaskPayload,
    value: string
  ) => {
    setEditForm((f) => {
      const subs = [...(f.subtasks ?? [])];
      if (!subs[idx]) subs[idx] = { title: '', description: '' };
      subs[idx] = { ...subs[idx], [field]: value };
      return { ...f, subtasks: subs };
    });
  };

  const isLoadingDetail = open && !!taskRef && taskQuery.isLoading && !displayTask;
  const isErrorDetail = open && !!taskRef && (taskQuery.isError || (taskQuery.data && !taskQuery.data.task));
  if (!task && !taskRef) return null;

  const creatorName = displayTask?.creator
    ? [displayTask.creator.name, displayTask.creator.surname].filter(Boolean).join(' ').trim()
    : '-';

  const selectedAssigneeUids = (editForm.assignees ?? []).map((a) => a.uid);
  const selectedClientUids = (editForm.clients ?? []).map((c) => c.uid);
  const assigneesLabel =
    selectedAssigneeUids.length === 0
      ? 'No assignees'
      : selectedAssigneeUids.length === 1
        ? (() => {
            const u = users.find((u) => u.uid === selectedAssigneeUids[0]);
            return u ? [u.name, u.surname].filter(Boolean).join(' ') || u.email || `User ${u.uid}` : `User ${selectedAssigneeUids[0]}`;
          })()
        : `${selectedAssigneeUids.length} assignees`;
  const clientsLabel =
    selectedClientUids.length === 0
      ? 'No clients'
      : selectedClientUids.length === 1
        ? clientsList.find((c) => c.uid === selectedClientUids[0])?.name ??
          `Client ${selectedClientUids[0]}`
        : `${selectedClientUids.length} clients`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={DETAIL_DIALOG_CONTENT_CLASS}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2Icon className="size-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading task details…</p>
            </div>
          ) : isErrorDetail ? (
            <div className="py-8 text-center">
              <p className="text-destructive font-medium">Failed to load task</p>
              <p className="text-sm text-muted-foreground mt-1">Please try again or close and reopen.</p>
              <Button variant="outline" className="mt-4" onClick={() => taskQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : displayTask ? (
            <>
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {!isEditing && (
            <>
              {(displayTask.jobStatus === 'QUEUED' || displayTask.jobStatus === 'RUNNING') && (
                <Button
                  size="sm"
                  className="gap-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleJobStatus();
                  }}
                  disabled={toggleJobMutation.isPending || cancelJobMutation.isPending}
                >
                  {toggleJobMutation.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : displayTask.jobStatus === 'QUEUED' ? (
                    <Play className="size-4" />
                  ) : (
                    <Square className="size-4" />
                  )}
                  {displayTask.jobStatus === 'QUEUED' ? 'Start job' : 'Complete job'}
                </Button>
              )}
              {displayTask.jobStatus === 'RUNNING' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-full border-amber-600/50 text-amber-800 hover:bg-amber-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCancelJobConfirmOpen(true);
                  }}
                  disabled={cancelJobMutation.isPending || toggleJobMutation.isPending}
                >
                  <Ban className="size-4" />
                  Cancel job
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full border-destructive text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTaskConfirmOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Delete task
              </Button>
              <Button
                size="sm"
                className="gap-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            </>
          )}
          <DetailDialogCloseButton />
        </div>
        <DialogHeader className="pr-24">
          <DialogTitle>Task #{displayTask.uid}</DialogTitle>
          <DialogDescription>
            {creatorName} ·{' '}
            {displayTask.createdAt
              ? format(new Date(displayTask.createdAt), 'MMM d, yyyy')
              : '-'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 text-sm">
          <div>
            <DetailSectionHeading title="Details" icon={ClipboardList} />
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={editForm.title ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editForm.description ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      rows={4}
                      className="resize-y"
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editForm.comment ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          comment: e.target.value,
                        }))
                      }
                      placeholder="Optional notes"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={editForm.status ?? '_none'}
                      onValueChange={(v) =>
                        setEditForm((f) => ({
                          ...f,
                          status: v as Task['status'],
                        }))
                      }
                    >
                      <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="z-[10001]">
                        {TASK_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={editForm.priority ?? '_none'}
                      onValueChange={(v) =>
                        setEditForm((f) => ({
                          ...f,
                          priority: v as Task['priority'],
                        }))
                      }
                    >
                      <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="z-[10001]">
                        {TASK_PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Task type</Label>
                    <Select
                      value={editForm.taskType ?? '_none'}
                      onValueChange={(v) =>
                        setEditForm((f) => ({
                          ...f,
                          taskType: v as Task['taskType'],
                        }))
                      }
                    >
                      <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="z-[10001]">
                        {TASK_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Progress (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.progress ?? 0}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          progress: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Deadline *</Label>
                    <Popover
                      open={deadlinePickerOpen}
                      onOpenChange={setDeadlinePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            MODAL_SELECT_TRIGGER,
                            'justify-start',
                            !editForm.deadline && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {editForm.deadline &&
                          /^\d{4}-\d{2}-\d{2}/.test(editForm.deadline)
                            ? format(
                                new Date(editForm.deadline),
                                'MMM d, yyyy'
                              )
                            : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="z-[10001]">
                        <Calendar
                          mode="single"
                          selected={
                            editForm.deadline
                              ? new Date(editForm.deadline)
                              : undefined
                          }
                          onSelect={(d) => {
                            setEditForm((f) => ({
                              ...f,
                              deadline: d ? format(d, 'yyyy-MM-dd') : undefined,
                            }));
                            setDeadlinePickerOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>Repetition</Label>
                    <Select
                      value={editForm.repetitionType ?? 'NONE'}
                      onValueChange={(v) =>
                        setEditForm((f) => ({
                          ...f,
                          repetitionType: v,
                          ...(v === 'NONE' && {
                            repetitionDeadline: undefined,
                          }),
                        }))
                      }
                    >
                      <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="z-[10001]">
                        {REPETITION_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.icon className="size-4 shrink-0" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(editForm.repetitionType ?? 'NONE') !== 'NONE' && (
                    <div className="grid gap-2">
                      <Label>Repetition end date *</Label>
                      <Popover
                        open={repetitionDeadlinePickerOpen}
                        onOpenChange={setRepetitionDeadlinePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              MODAL_SELECT_TRIGGER,
                              'justify-start',
                              !editForm.repetitionDeadline &&
                                'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {editForm.repetitionDeadline &&
                            /^\d{4}-\d{2}-\d{2}/.test(
                              editForm.repetitionDeadline
                            )
                              ? format(
                                  new Date(editForm.repetitionDeadline),
                                  'MMM d, yyyy'
                                )
                              : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[10001]">
                          <Calendar
                            mode="single"
                            selected={
                              editForm.repetitionDeadline
                                ? new Date(editForm.repetitionDeadline)
                                : undefined
                            }
                            onSelect={(d) => {
                              setEditForm((f) => ({
                                ...f,
                                repetitionDeadline: d
                                  ? format(d, 'yyyy-MM-dd')
                                  : undefined,
                              }));
                              setRepetitionDeadlinePickerOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Assignees</Label>
                    <Popover
                      open={assigneesPopoverOpen}
                      onOpenChange={setAssigneesPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            MODAL_SELECT_TRIGGER,
                            'justify-start text-left font-normal'
                          )}
                        >
                          {assigneesLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(100vw-2rem,22rem)] p-0 z-[10001]"
                        align="start"
                      >
                        <PlanningAssigneesMultiSelectPanel
                          users={users}
                          branches={branches}
                          selectedUids={selectedAssigneeUids}
                          onToggleUid={toggleAssignee}
                          searchQuery={assigneeSearchQuery}
                          onSearchQueryChange={setAssigneeSearchQuery}
                          isSearchLoading={isAssigneeSearchLoading}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>Clients</Label>
                    <Popover
                      open={clientsPopoverOpen}
                      onOpenChange={setClientsPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            MODAL_SELECT_TRIGGER,
                            'justify-start text-left font-normal'
                          )}
                        >
                          {clientsLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(100vw-2rem,22rem)] p-0 z-[10001]"
                        align="start"
                      >
                        <PlanningClientsMultiSelectPanel
                          clients={clientsList}
                          selectedUids={selectedClientUids}
                          onToggleUid={toggleClient}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Target category</Label>
                    <Input
                      value={editForm.targetCategory ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          targetCategory: e.target.value,
                        }))
                      }
                      placeholder="e.g. enterprise"
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Attachments (comma-separated URLs)</Label>
                    <Input
                      value={(editForm.attachments ?? []).join(', ')}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          attachments: e.target.value
                            .split(/[,\s]+/)
                            .map((u) => u.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="URLs"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Subtasks</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={addSubtask}
                    >
                      <Plus className="size-4" />
                      Add subtask
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(editForm.subtasks ?? []).map((sub, idx) => (
                      <div
                        key={sub.uid ?? `new-${idx}`}
                        className="flex gap-2 items-start rounded border p-2 bg-muted/30"
                      >
                        <div className="flex-1 grid gap-2 sm:grid-cols-2">
                          <Input
                            placeholder="Subtask title"
                            value={sub.title}
                            onChange={(e) =>
                              updateSubtask(idx, 'title', e.target.value)
                            }
                          />
                          <Input
                            placeholder="Subtask description"
                            value={sub.description}
                            onChange={(e) =>
                              updateSubtask(idx, 'description', e.target.value)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeSubtask(idx)}
                          aria-label="Remove subtask"
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <dl className={cn(DETAIL_FIELD_GRID_CLASS, 'gap-y-4')}>
                    <DetailFieldRow label="Title" icon={FileText} value={displayTask.title} />
                    <DetailFieldRow
                      label="Status"
                      icon={BadgeCheck}
                      value={displayTask.status?.replace(/_/g, ' ') ?? '-'}
                    />
                    <DetailFieldRow label="Priority" icon={ListOrdered} value={displayTask.priority ?? '-'} />
                    <DetailFieldRow
                      label="Type"
                      icon={Layers}
                      value={displayTask.taskType?.replace(/_/g, ' ') ?? '-'}
                    />
                    <DetailFieldRow
                      label="Deadline"
                      icon={CalendarClock}
                      value={formatDeadline(displayTask.deadline)}
                    />
                    <DetailFieldRow
                      label="Progress"
                      icon={Percent}
                      value={`${displayTask.progress ?? 0}%`}
                    />
                    <DetailFieldRow
                      label="Completion date"
                      icon={CalendarCheck2}
                      value={formatCompletionDate(displayTask.completionDate)}
                    />
                    <DetailFieldRow
                      label="Repetition"
                      icon={Repeat}
                      value={displayTask.repetitionType?.replace(/_/g, ' ') ?? '-'}
                    />
                    <DetailFieldRow
                      label="Target category"
                      icon={FolderOpen}
                      value={displayTask.targetCategory || '-'}
                    />
                    {(displayTask.jobStatus ?? displayTask.jobStartTime ?? displayTask.jobEndTime != null) && (
                      <>
                        <DetailFieldRow label="Job status" icon={Cpu} value={displayTask.jobStatus ?? '-'} />
                        <DetailFieldRow
                          label="Job start"
                          icon={LogIn}
                          value={
                            displayTask.jobStartTime
                              ? format(new Date(displayTask.jobStartTime), 'PPp')
                              : '-'
                          }
                        />
                        <DetailFieldRow
                          label="Job end"
                          icon={LogOut}
                          value={
                            displayTask.jobEndTime
                              ? format(new Date(displayTask.jobEndTime), 'PPp')
                              : '-'
                          }
                        />
                        <DetailFieldRow
                          label="Job duration"
                          icon={Timer}
                          value={
                            jobDurationTick >= 0
                              ? formatJobDurationDisplay(displayTask)
                              : '-'
                          }
                        />
                      </>
                    )}
                  </dl>
                  {displayTask.isOverdue && (
                    <p className="mt-2 text-amber-600 font-medium">Overdue</p>
                  )}
                </div>
                <Separator className="my-2" />
                <div>
                  <DetailSectionHeading title="Description" icon={AlignLeft} />
                  <p className="text-muted-foreground">{displayTask.description || '-'}</p>
                </div>
                <Separator className="my-2" />
                <div>
                  <DetailSectionHeading title="Assignees" icon={Users} />
                  {(displayTask.assignees ?? []).length === 0 ? (
                    <p className="text-muted-foreground">-</p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-2">
                      {(displayTask.assignees ?? []).map((assignee, idx) => {
                        const { fullName, imageSrc } = resolveAssigneeProfile(
                          assignee,
                          users
                        );
                        return (
                          <li
                            key={assignee.uid ?? assignee.clerkUserId ?? idx}
                            className="flex items-center gap-2 min-w-0"
                          >
                            <Avatar className="size-8 shrink-0 border border-border">
                              <AvatarImage src={imageSrc} alt={fullName} />
                              <AvatarFallback className="text-xs">
                                {fullName !== '-'
                                  ? fullName.slice(0, 2).toUpperCase()
                                  : '-'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{fullName}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <Separator className="my-2" />
                <div>
                  <DetailSectionHeading title="Clients" icon={Building2} />
                  <p className="text-muted-foreground mt-1">
                    {formatClients(displayTask)}
                  </p>
                </div>
                <Separator className="my-2" />
                <div>
                  <DetailSectionHeading title="Creator" icon={User} />
                  {(() => {
                    const { fullName, imageSrc } = resolveCreatorProfile(
                      displayTask.creator,
                      users
                    );
                    return (
                      <div className="mt-1 flex items-center gap-2 min-w-0">
                        <Avatar className="size-8 shrink-0 border border-border">
                          <AvatarImage src={imageSrc} alt={fullName} />
                          <AvatarFallback className="text-xs">
                            {fullName !== '-'
                              ? fullName.slice(0, 2).toUpperCase()
                              : '-'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{fullName}</span>
                      </div>
                    );
                  })()}
                </div>
                {displayTask.comment?.trim() ? (
                  <>
                    <Separator className="my-2" />
                    <div>
                      <DetailSectionHeading title="Notes" icon={MessageSquare} />
                      <p className="text-muted-foreground whitespace-pre-wrap">{displayTask.comment}</p>
                    </div>
                  </>
                ) : null}
                {displayTask.uid ? (
                  <>
                    <Separator className="my-2" />
                    <TaskFlagsSection taskId={displayTask.uid} />
                  </>
                ) : null}
                {(displayTask.subtasks?.length ?? 0) > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div>
                      <DetailSectionHeading title="Subtasks" icon={ListTodo} />
                      <ul className="list-none space-y-1.5">
                        {(displayTask.subtasks ?? [])
                          .filter((s) => !s.isDeleted)
                          .map((s) => (
                            <li
                              key={s.uid ?? s.title}
                              className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1.5"
                            >
                              <span className={cn(
                                'text-sm',
                                (s.status === 'completed' || s.status === 'COMPLETED') && 'line-through text-muted-foreground'
                              )}>
                                {s.title}
                                {(s.status === 'completed' || s.status === 'COMPLETED') && (
                                  <span className="ml-1.5 text-xs">(done)</span>
                                )}
                              </span>
                              <span className="flex items-center gap-1 shrink-0">
                                {(s.status !== 'completed' && s.status !== 'COMPLETED') && s.uid && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => void handleCompleteSubtask(s.uid!)}
                                    disabled={completeSubtaskMutation.isPending}
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    Complete
                                  </Button>
                                )}
                                {s.uid && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteSubtaskRef(s.uid!)}
                                    disabled={deleteSubtaskMutation.isPending}
                                    aria-label="Remove subtask"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </>
                )}
                {(displayTask.attachments?.length ?? 0) > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div>
                      <DetailSectionHeading title="Attachments" icon={Paperclip} />
                      <p className="text-muted-foreground">{displayTask.attachments!.join(', ')}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {isEditing && (
          <DialogFooter className="gap-3 sm:flex-row sm:justify-end">
            <div className="flex w-full gap-3 sm:ml-auto sm:max-w-md">
              <Button
                variant="cancel"
                className="flex-1 rounded-md"
                onClick={handleCancelEdit}
                disabled={
                  updateMutation.isPending ||
                  updateSubtaskMutation.isPending ||
                  deleteSubtaskMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                variant="success"
                className="flex-[2] rounded-md"
                onClick={() => void handleSaveEdit()}
                disabled={
                  updateMutation.isPending ||
                  updateSubtaskMutation.isPending ||
                  deleteSubtaskMutation.isPending
                }
              >
                {(updateMutation.isPending ||
                  updateSubtaskMutation.isPending ||
                  deleteSubtaskMutation.isPending) && (
                  <Loader2Icon className="size-4 animate-spin shrink-0" />
                )}
                Save
              </Button>
            </div>
          </DialogFooter>
        )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTaskConfirmOpen} onOpenChange={setDeleteTaskConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the task. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteTask();
              }}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelJobConfirmOpen} onOpenChange={setCancelJobConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel active job?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops the running job, closes the current time segment, and returns the task job to
              queued. The task itself is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-700 text-white hover:bg-amber-800"
              onClick={(e) => {
                e.preventDefault();
                void handleCancelJob();
              }}
              disabled={cancelJobMutation.isPending}
            >
              {cancelJobMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Cancel job'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteSubtaskRef != null}
        onOpenChange={(open) => !open && setDeleteSubtaskRef(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the subtask from the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteSubtask();
              }}
              disabled={deleteSubtaskMutation.isPending}
            >
              {deleteSubtaskMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
