'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import {
  useTaskFlags,
  useCreateTaskFlagMutation,
  useUpdateTaskFlagItemMutation,
} from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2Icon } from '@/lib/icons';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { TaskFlag, TaskFlagItemStatusValue } from '@/api/types/tasks';

interface TaskFlagsSectionProps {
  taskId: number;
}

export function TaskFlagsSection({ taskId }: TaskFlagsSectionProps) {
  const flagsQuery = useTaskFlags(taskId);
  const createMutation = useCreateTaskFlagMutation();
  const updateItemMutation = useUpdateTaskFlagItemMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const flags = flagsQuery.data?.data ?? [];

  async function handleCreate() {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    const items = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ title: line, description: '' }));
    try {
      await createMutation.mutateAsync({
        taskId,
        title: title.trim(),
        description: description.trim(),
        items: items.length > 0 ? items : undefined,
      });
      toast.success('Checklist created');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setChecklistText('');
    } catch {
      toast.error('Failed to create checklist');
    }
  }

  async function toggleItem(
    flag: TaskFlag,
    itemUid: number,
    current: TaskFlagItemStatusValue
  ) {
    const next: TaskFlagItemStatusValue =
      current === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await updateItemMutation.mutateAsync({
        itemId: itemUid,
        taskId,
        payload: { status: next },
      });
    } catch {
      toast.error('Failed to update item');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Execution checklist</h3>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {flagsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading checklists…</p>
      ) : flags.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No checklists yet. Add steps reps should complete on site.
        </p>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <FlagCard
              key={flag.uid}
              flag={flag}
              taskId={taskId}
              onToggleItem={toggleItem}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New execution checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="flag-title">Title</Label>
              <Input
                id="flag-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shelf audit"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="flag-desc">Description</Label>
              <Textarea
                id="flag-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="flag-items">Checklist items (one per line)</Label>
              <Textarea
                id="flag-items"
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                rows={4}
                placeholder={'Planogram OK\nStock levels checked\nPhotos taken'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlagCard({
  flag,
  taskId,
  onToggleItem,
}: {
  flag: TaskFlag;
  taskId: number;
  onToggleItem: (
    flag: TaskFlag,
    itemUid: number,
    current: TaskFlagItemStatusValue
  ) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{flag.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
        {flag.description}
      </p>
      {flag.items && flag.items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {flag.items.map((item) => (
            <li key={item.uid} className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={item.status === 'COMPLETED'}
                onCheckedChange={() =>
                  onToggleItem(flag, item.uid, item.status)
                }
                className="mt-0.5"
              />
              <span
                className={cn(
                  item.status === 'COMPLETED' && 'text-muted-foreground line-through'
                )}
              >
                {item.title}
              </span>
              {item.status === 'COMPLETED' ? (
                <CheckCircle2 className="ml-auto size-3.5 shrink-0 text-green-600" />
              ) : (
                <Circle className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
