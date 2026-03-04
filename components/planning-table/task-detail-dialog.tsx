'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Task } from '@/api/types/tasks';
import type { UpdateTaskPayload, SubtaskPayload } from '@/api/types/tasks';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2Icon, XIcon, CalendarIcon, StoreIcon } from '@/lib/icons';
import { useUpdateTaskMutation, useUsers, useClients } from '@/api/hooks';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  REPETITION_TYPE_OPTIONS,
} from '@/lib/task-form-utils';
import {
  formatDeadline,
  formatAssignees,
  formatClients,
  formatCompletionDate,
} from './planning-table-utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function taskToEditForm(
  task: Task,
  users: Array<{ uid: number; clerkUserId?: string }>
): Partial<UpdateTaskPayload> {
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
    subtasks: (task.subtasks ?? []).map((s) => ({
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
  const [editForm, setEditForm] = useState<Partial<UpdateTaskPayload>>({});
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  const [repetitionDeadlinePickerOpen, setRepetitionDeadlinePickerOpen] =
    useState(false);
  const [assigneesPopoverOpen, setAssigneesPopoverOpen] = useState(false);
  const [clientsPopoverOpen, setClientsPopoverOpen] = useState(false);

  const updateMutation = useUpdateTaskMutation();
  const { data: users = [] } = useUsers({ page: 1, limit: 100, enabled: open });
  const { data: clientsList = [] } = useClients({
    page: 1,
    limit: 100,
    enabled: open,
  });

  useEffect(() => {
    if (!task || !open) return;
    setEditForm(taskToEditForm(task, users));
    setIsEditing(false);
  }, [task?.uid, open, users]);

  const handleCancelEdit = () => {
    if (task) setEditForm(taskToEditForm(task, users));
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!task) return;
    const payload: UpdateTaskPayload = { ...editForm };
    if (payload.repetitionType === 'NONE') {
      delete payload.repetitionDeadline;
    }
    if (payload.attachments?.length === 0) {
      delete payload.attachments;
    }
    try {
      await updateMutation.mutateAsync({ ref: task.uid, payload });
      toast.success('Task updated');
      setIsEditing(false);
      onTaskUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update task');
    }
  };

  const toggleAssignee = (uid: number) => {
    const current = editForm.assignees ?? [];
    const has = current.some((a) => a.uid === uid);
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

  if (!task) return null;

  const creatorName = task.creator
    ? [task.creator.name, task.creator.surname].filter(Boolean).join(' ').trim()
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {!isEditing && (
            <Button
              size="sm"
              className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          <DialogClose asChild>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close"
            >
              <XIcon className="size-5" />
            </button>
          </DialogClose>
        </div>
        <DialogHeader className="pr-24">
          <DialogTitle>Task #{task.uid}</DialogTitle>
          <DialogDescription>
            {creatorName} ·{' '}
            {task.createdAt
              ? format(new Date(task.createdAt), 'MMM d, yyyy')
              : '-'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Details</h4>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={editForm.title ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
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
                  <div>
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
                      <SelectTrigger>
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
                  <div>
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
                      <SelectTrigger>
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
                  <div>
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
                      <SelectTrigger>
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
                  <div>
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
                  <div>
                    <Label>Deadline</Label>
                    <Popover
                      open={deadlinePickerOpen}
                      onOpenChange={setDeadlinePickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start',
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
                  <div>
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
                      <SelectTrigger>
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
                    <div>
                      <Label>Repetition end date</Label>
                      <Popover
                        open={repetitionDeadlinePickerOpen}
                        onOpenChange={setRepetitionDeadlinePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start',
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
                  <div>
                    <Label>Assignees</Label>
                    <Popover
                      open={assigneesPopoverOpen}
                      onOpenChange={setAssigneesPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {assigneesLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[280px] p-0 z-[10001]"
                        align="start"
                      >
                        <div className="max-h-[240px] overflow-y-auto p-2">
                          {users.map((u) => {
                            const fullName =
                              [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                              u.email ||
                              `User ${u.uid}`;
                            const imgSrc =
                              (u as { photoURL?: string | null; avatar?: string | null }).photoURL ??
                              (u as { photoURL?: string | null; avatar?: string | null }).avatar ??
                              undefined;
                            return (
                              <label
                                key={u.uid}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                              >
                                <Checkbox
                                  checked={selectedAssigneeUids.includes(u.uid)}
                                  onCheckedChange={() => toggleAssignee(u.uid)}
                                />
                                <Avatar className="size-6 shrink-0">
                                  <AvatarImage src={imgSrc} alt={fullName} />
                                  <AvatarFallback className="text-xs">
                                    {fullName !== `User ${u.uid}` ? fullName.slice(0, 2).toUpperCase() : String(u.uid).slice(-2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{fullName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Clients</Label>
                    <Popover
                      open={clientsPopoverOpen}
                      onOpenChange={setClientsPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {clientsLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[280px] p-0 z-[10001]"
                        align="start"
                      >
                        <div className="max-h-[240px] overflow-y-auto p-2">
                          {clientsList.map((c) => (
                            <label
                              key={c.uid}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={selectedClientUids.includes(c.uid)}
                                onCheckedChange={() => toggleClient(c.uid)}
                              />
                              <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                              <span className="text-sm">{c.name}</span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2">
                    <Label>Comment</Label>
                    <Textarea
                      value={editForm.comment ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          comment: e.target.value,
                        }))
                      }
                      rows={2}
                      className="resize-y"
                      placeholder="Optional comment"
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
                        key={idx}
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
              <div className="grid gap-x-4 gap-y-1 text-muted-foreground text-sm sm:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Title:</span>{' '}
                  {task.title}
                </p>
                <p>
                  <span className="font-medium text-foreground">Status:</span>{' '}
                  {task.status?.replace(/_/g, ' ')}
                </p>
                <p>
                  <span className="font-medium text-foreground">Priority:</span>{' '}
                  {task.priority}
                </p>
                <p>
                  <span className="font-medium text-foreground">Type:</span>{' '}
                  {task.taskType?.replace(/_/g, ' ')}
                </p>
                <p>
                  <span className="font-medium text-foreground">Deadline:</span>{' '}
                  {formatDeadline(task.deadline)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Progress:</span>{' '}
                  {task.progress ?? 0}%
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Completion date:
                  </span>{' '}
                  {formatCompletionDate(task.completionDate)}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Repetition:
                  </span>{' '}
                  {task.repetitionType?.replace(/_/g, ' ') ?? '-'}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Target category:
                  </span>{' '}
                  {task.targetCategory || '-'}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-medium text-foreground">
                    Description:
                  </span>{' '}
                  {task.description || '-'}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Assignees:
                  </span>{' '}
                  {formatAssignees(task)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Clients:</span>{' '}
                  {formatClients(task)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Creator:</span>{' '}
                  {creatorName}
                </p>
                {task.comment && (
                  <p className="sm:col-span-2">
                    <span className="font-medium text-foreground">
                      Comment:
                    </span>{' '}
                    {task.comment}
                  </p>
                )}
                {(task.subtasks?.length ?? 0) > 0 && (
                  <p className="sm:col-span-2">
                    <span className="font-medium text-foreground">
                      Subtasks:
                    </span>{' '}
                    {task.subtasks!.map((s) => s.title).join(', ')}
                  </p>
                )}
                {(task.attachments?.length ?? 0) > 0 && (
                  <p className="sm:col-span-2">
                    <span className="font-medium text-foreground">
                      Attachments:
                    </span>{' '}
                    {task.attachments!.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        {isEditing && (
          <DialogFooter className="gap-3">
            <Button
              variant="cancel"
              onClick={handleCancelEdit}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
