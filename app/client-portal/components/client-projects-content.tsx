'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FolderKanban, Plus } from 'lucide-react';
import type {
  ClientProfileData,
  ClientProject,
  CreateClientProjectPayload,
} from '@/api/types/client-portal';
import { createClientProject } from '@/api/endpoints/client-portal';
import { useApiClient } from '@/api/hooks/use-api-client';
import { LINKED_CLIENT_FULL_PROFILE_QUERY_KEY } from '@/api/hooks/use-linked-client-profile';
import { formatZar } from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ProjectDetailDialog } from './project-detail-dialog';
import toast from 'react-hot-toast';

const PROJECT_STATUSES = [
  'planning',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
] as const;

export function ClientProjectsContent({ client }: { client: ClientProfileData }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const projects = ([...(client.projects ?? [])] as ClientProject[]).sort(
    (a, b) => (b.budget ?? 0) - (a.budget ?? 0)
  );
  const [selected, setSelected] = useState<ClientProject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateClientProjectPayload>({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    type: 'general',
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientProjectPayload) =>
      createClientProject(apiClient, { ...payload, clientUid: client.uid }),
    onSuccess: () => {
      toast.success('Project created');
      queryClient.invalidateQueries({ queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY });
      setCreateOpen(false);
      setForm({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        type: 'general',
      });
    },
    onError: () => toast.error('Failed to create project'),
  });

  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="pt-6 flex items-center gap-3">
            <FolderKanban className="size-8 text-violet-600" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Projects</p>
              <p className="text-xl font-semibold">{projects.length}</p>
              <p className="text-sm text-muted-foreground">
                Total budget {formatZar(totalBudget)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          New project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No projects yet. Create one to get started.
            </p>
          ) : (
            projects.map((p) => (
              <button
                key={p.uid}
                type="button"
                className="w-full flex items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50"
                onClick={() => setSelected(p)}
              >
                <div>
                  <p className="font-medium">{p.name ?? `Project #${p.uid}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.budget != null ? formatZar(p.budget) : '—'}
                    {p.createdAt &&
                      ` · ${format(new Date(p.createdAt), 'dd MMM yyyy')}`}
                  </p>
                </div>
                <Badge variant="secondary">
                  {(p.status ?? 'unknown').replace(/_/g, ' ')}
                </Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <ProjectDetailDialog
        project={selected}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error('Project name is required');
                return;
              }
              createMutation.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pname">Name</Label>
              <Input
                id="pname"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Description</Label>
              <Textarea
                id="pdesc"
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pbudget">Budget (ZAR)</Label>
              <Input
                id="pbudget"
                type="number"
                min={0}
                value={form.budget ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budget: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
