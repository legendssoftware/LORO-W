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
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateTaskMutation, useUsers, useClients } from '@/api/hooks';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  REPETITION_TYPE_OPTIONS,
} from '@/lib/task-form-utils';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, Loader2Icon, XIcon, StoreIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { CreateTaskPayload, SubtaskPayload } from '@/api/types/tasks';
import { format } from 'date-fns';

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
  const { data: users = [] } = useUsers({ limit: 100, enabled: open });
  const { data: clientsList = [] } = useClients({ limit: 100, enabled: open });

  useEffect(() => {
    if (open) {
      setForm(defaultForm);
      setSelectedAssigneeUids([]);
      setSelectedClientUids([]);
      setAttachmentsInput('');
    }
  }, [open]);

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
    const payload: CreateTaskPayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      taskType: form.taskType ?? 'OTHER',
      priority: form.priority ?? 'MEDIUM',
      ...(form.deadline && { deadline: form.deadline }),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task with title, description, assignees, clients, subtasks,
            and optional repetition or attachments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="create-task-title">Title *</Label>
              <Input
                id="create-task-title"
                value={form.title ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                required
              />
            </div>
            <div className="sm:col-span-2">
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
                required
              />
            </div>
            <div>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Deadline</Label>
              <Popover
                open={deadlinePickerOpen}
                onOpenChange={setDeadlinePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start',
                      !form.deadline && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {form.deadline
                      ? format(new Date(form.deadline), 'MMM d, yyyy')
                      : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
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
            <div>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select repetition" />
                </SelectTrigger>
                <SelectContent>
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
              <div>
                <Label>Repetition end date</Label>
                <Popover
                  open={repetitionDeadlinePickerOpen}
                  onOpenChange={setRepetitionDeadlinePickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start',
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
                  <PopoverContent>
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
            <div>
              <Label>Assignees</Label>
              <Popover
                open={assigneesPopoverOpen}
                onOpenChange={setAssigneesPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {assigneesLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
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
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {clientsLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
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
            <div className="sm:col-span-2">
              <Label htmlFor="create-task-attachments">Attachments (URLs)</Label>
              <Input
                id="create-task-attachments"
                value={attachmentsInput}
                onChange={(e) => setAttachmentsInput(e.target.value)}
                placeholder="Comma-separated URLs"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="create-task-comment">Comment</Label>
              <Textarea
                id="create-task-comment"
                value={form.comment ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, comment: e.target.value }))
                }
                placeholder="Optional comment"
                rows={2}
                className="resize-y"
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

          <DialogFooter>
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin shrink-0" />
              ) : (
                <Plus className="size-4 shrink-0" />
              )}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
