'use client';

import { useState, useEffect } from 'react';
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
  DetailSectionHeading,
  DETAIL_DIALOG_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { useCreateTaskMutation, useUsers, useClients, useBranches } from '@/api/hooks';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { usePlanningStore } from '@/store/planning-store';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  REPETITION_TYPE_OPTIONS,
} from '@/lib/task-form-utils';
import {
  Plus,
  ClipboardList,
  CalendarClock,
  Users,
  FolderOpen,
  ListTodo,
} from 'lucide-react';
import { CalendarIcon, Loader2Icon, XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  PlanningAssigneesMultiSelectPanel,
  PlanningClientsMultiSelectPanel,
} from '@/app/planning/components/planning-task-multi-select-panels';
import type { CreateTaskPayload, SubtaskPayload } from '@/api/types/tasks';
import { format } from 'date-fns';

const MODAL_SELECT_TRIGGER =
  'h-9 w-full bg-white border-gray-200 text-foreground';
const MODAL_SELECT_CONTENT = 'z-[10001]';

export interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const defaultForm: Partial<CreateTaskPayload> = {
  title: '',
  description: '',
  taskType: 'OTHER',
  priority: 'MEDIUM',
  deadline: undefined,
  repetitionType: 'NONE',
  repetitionDeadline: undefined,
  targetCategory: '',
  comment: '',
  assignees: [],
  client: [],
  subtasks: [],
  attachments: [],
};

export function CreateTaskModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateTaskModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  const [repetitionDeadlinePickerOpen, setRepetitionDeadlinePickerOpen] =
    useState(false);
  const [selectedAssigneeUids, setSelectedAssigneeUids] = useState<number[]>(
    []
  );
  const [selectedClientUids, setSelectedClientUids] = useState<number[]>([]);
  const [assigneesPopoverOpen, setAssigneesPopoverOpen] = useState(false);
  const [clientsPopoverOpen, setClientsPopoverOpen] = useState(false);
  const [attachmentsInput, setAttachmentsInput] = useState('');

  const createMutation = useCreateTaskMutation();
  const { backendUserData } = useSessionSync();
  const {
    selectedAssigneeId,
    selectedPriority,
    useAllTime,
    endDate,
  } = usePlanningStore();

  const { data: users = [] } = useUsers({
    page: 1,
    limit: 100,
    enabled: open,
  });
  const { data: clientsList = [] } = useClients({
    page: 1,
    limit: 100,
    enabled: open,
  });
  const { data: branches = [] } = useBranches({
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;

    const next: Partial<CreateTaskPayload> = { ...defaultForm };
    const assigneeIds: number[] = [];

    const filterAssignee = (() => {
      const raw = selectedAssigneeId?.trim();
      if (!raw || raw === 'all') return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

    if (filterAssignee != null) assigneeIds.push(filterAssignee);

    if (assigneeIds.length === 0 && backendUserData?.uid) {
      assigneeIds.push(backendUserData.uid);
    }

    if (selectedPriority && selectedPriority !== 'all') {
      next.priority = selectedPriority as CreateTaskPayload['priority'];
    }

    if (!useAllTime && endDate) {
      next.deadline = format(endDate, 'yyyy-MM-dd');
    } else if (!next.deadline) {
      next.deadline = format(new Date(), 'yyyy-MM-dd');
    }

    setForm(next);
    setSelectedAssigneeUids(assigneeIds);
    setSelectedClientUids([]);
    setAttachmentsInput('');
  }, [
    open,
    selectedAssigneeId,
    selectedPriority,
    useAllTime,
    endDate,
    backendUserData?.uid,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.description?.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!form.deadline?.trim()) {
      toast.error('Deadline is required');
      return;
    }
    if (
      form.repetitionType &&
      form.repetitionType !== 'NONE' &&
      !form.repetitionDeadline?.trim()
    ) {
      toast.error('Repetition end date is required');
      return;
    }
    const payload: CreateTaskPayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      taskType: form.taskType ?? 'OTHER',
      priority: form.priority ?? 'MEDIUM',
      deadline: form.deadline.trim(),
      ...(form.repetitionType &&
        form.repetitionType !== 'NONE' && { repetitionType: form.repetitionType }),
      ...(form.repetitionDeadline &&
        form.repetitionType !== 'NONE' && {
          repetitionDeadline: form.repetitionDeadline,
        }),
      ...(form.targetCategory?.trim() && {
        targetCategory: form.targetCategory.trim(),
      }),
      ...(form.comment?.trim() && { comment: form.comment.trim() }),
      ...(selectedAssigneeUids.length > 0 && {
        assignees: selectedAssigneeUids.map((uid) => ({ uid })),
      }),
      ...(selectedClientUids.length > 0 && {
        client: selectedClientUids.map((uid) => ({ uid })),
      }),
      ...(form.subtasks &&
        form.subtasks.length > 0 &&
        form.subtasks.some((s) => s.title?.trim()) && {
          subtasks: form.subtasks
            .filter((s) => s.title?.trim())
            .map((s) => ({
              title: s.title.trim(),
              description: s.description?.trim() ?? '',
            })),
        }),
      ...(attachmentsInput.trim() && {
        attachments: attachmentsInput
          .split(/[,\s]+/)
          .map((u) => u.trim())
          .filter(Boolean),
      }),
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success('Task created');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const toggleAssignee = (uid: number) => {
    setSelectedAssigneeUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleClient = (uid: number) => {
    setSelectedClientUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const addSubtask = () => {
    setForm((f) => ({
      ...f,
      subtasks: [...(f.subtasks ?? []), { title: '', description: '' }],
    }));
  };

  const removeSubtask = (idx: number) => {
    setForm((f) => ({
      ...f,
      subtasks: (f.subtasks ?? []).filter((_, i) => i !== idx),
    }));
  };

  const updateSubtask = (idx: number, field: keyof SubtaskPayload, value: string) => {
    setForm((f) => {
      const subs = [...(f.subtasks ?? [])];
      if (!subs[idx]) subs[idx] = { title: '', description: '' };
      subs[idx] = { ...subs[idx], [field]: value };
      return { ...f, subtasks: subs };
    });
  };

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
        className={DETAIL_DIALOG_CONTENT_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <DetailDialogCloseButton />
        </div>
        <DialogHeader className="pr-24">
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task with title, description, notes, assignees, clients, subtasks,
            and optional repetition or attachments.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <DetailSectionHeading title="Basic info" icon={ClipboardList} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="create-task-title">Title *</Label>
                <Input
                  id="create-task-title"
                  value={form.title ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Task title"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="create-task-description">Description *</Label>
                <Textarea
                  id="create-task-description"
                  value={form.description ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Task description"
                  rows={4}
                  className="resize-y"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="create-task-notes">Notes</Label>
                <Textarea
                  id="create-task-notes"
                  value={form.comment ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  placeholder="Optional notes"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <DetailSectionHeading title="Schedule" icon={CalendarClock} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Task type</Label>
                <Select
                  value={form.taskType ?? 'OTHER'}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      taskType: v as CreateTaskPayload['taskType'],
                    }))
                  }
                >
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className={MODAL_SELECT_CONTENT}>
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
                <Label>Priority</Label>
                <Select
                  value={form.priority ?? 'MEDIUM'}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      priority: v as CreateTaskPayload['priority'],
                    }))
                  }
                >
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className={MODAL_SELECT_CONTENT}>
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
                <Label>Deadline *</Label>
                <Popover
                  open={deadlinePickerOpen}
                  onOpenChange={setDeadlinePickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        MODAL_SELECT_TRIGGER,
                        'justify-start',
                        !form.deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {form.deadline
                        ? format(new Date(form.deadline), 'MMM d, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={MODAL_SELECT_CONTENT}>
                    <Calendar
                      mode="single"
                      selected={
                        form.deadline ? new Date(form.deadline) : undefined
                      }
                      onSelect={(d) => {
                        setForm((f) => ({
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
                  value={form.repetitionType ?? 'NONE'}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      repetitionType: v,
                      ...(v === 'NONE' && { repetitionDeadline: undefined }),
                    }))
                  }
                >
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Select repetition" />
                  </SelectTrigger>
                  <SelectContent className={MODAL_SELECT_CONTENT}>
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
              {(form.repetitionType ?? 'NONE') !== 'NONE' && (
                <div className="grid gap-2">
                  <Label>Repetition end date *</Label>
                  <Popover
                    open={repetitionDeadlinePickerOpen}
                    onOpenChange={setRepetitionDeadlinePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          MODAL_SELECT_TRIGGER,
                          'justify-start',
                          !form.repetitionDeadline && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {form.repetitionDeadline
                          ? format(
                              new Date(form.repetitionDeadline),
                              'MMM d, yyyy'
                            )
                          : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={MODAL_SELECT_CONTENT}>
                      <Calendar
                        mode="single"
                        selected={
                          form.repetitionDeadline
                            ? new Date(form.repetitionDeadline)
                            : undefined
                        }
                        onSelect={(d) => {
                          setForm((f) => ({
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
            </div>
          </div>
          <Separator />
          <div>
            <DetailSectionHeading title="People & clients" icon={Users} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Assignees</Label>
                <Popover
                  open={assigneesPopoverOpen}
                  onOpenChange={setAssigneesPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        MODAL_SELECT_TRIGGER,
                        'justify-start text-left font-normal'
                      )}
                    >
                      {assigneesLabel}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0 z-[10001]" align="start">
                    <PlanningAssigneesMultiSelectPanel
                      users={users}
                      branches={branches}
                      selectedUids={selectedAssigneeUids}
                      onToggleUid={toggleAssignee}
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
                      type="button"
                      variant="outline"
                      className={cn(
                        MODAL_SELECT_TRIGGER,
                        'justify-start text-left font-normal'
                      )}
                    >
                      {clientsLabel}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0 z-[10001]" align="start">
                    <PlanningClientsMultiSelectPanel
                      clients={clientsList}
                      selectedUids={selectedClientUids}
                      onToggleUid={toggleClient}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <DetailSectionHeading title="Other" icon={FolderOpen} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="create-task-target">Target category</Label>
                <Input
                  id="create-task-target"
                  value={form.targetCategory ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetCategory: e.target.value }))
                  }
                  placeholder="e.g. enterprise"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="create-task-attachments">Attachments (URLs)</Label>
                <Input
                  id="create-task-attachments"
                  value={attachmentsInput}
                  onChange={(e) => setAttachmentsInput(e.target.value)}
                  placeholder="Comma-separated URLs"
                />
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <DetailSectionHeading title="Subtasks" icon={ListTodo} />
            <div className="flex items-center justify-end mb-2">
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
              {(form.subtasks ?? []).map((sub, idx) => (
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

          <DialogFooter className="gap-3 sm:flex-row sm:justify-end">
            <div className="flex w-full gap-3 sm:ml-auto sm:max-w-md">
              <Button
                type="button"
                variant="cancel"
                className="flex-1 rounded-md"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={createMutation.isPending}
                className="flex-[2] gap-2 rounded-md"
              >
                {createMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin shrink-0" />
                ) : (
                  <Plus className="size-4 shrink-0" />
                )}
                Create task
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
