'use client';

import { format } from 'date-fns';
import type { ClientProject } from '@/api/types/client-portal';
import { formatZar } from '@/lib/client-portal-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ClientProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project.name ?? `Project #${project.uid}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Badge variant="secondary">
            {(project.status ?? 'unknown').replace(/_/g, ' ')}
          </Badge>
          {project.description && <p>{project.description}</p>}
          <p>
            <span className="text-muted-foreground">Budget: </span>
            {project.budget != null ? formatZar(project.budget) : '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Priority: </span>
            {project.priority ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Type: </span>
            {project.type ?? '—'}
          </p>
          {project.startDate && (
            <p>
              <span className="text-muted-foreground">Start: </span>
              {format(new Date(project.startDate), 'PP')}
            </p>
          )}
          {project.endDate && (
            <p>
              <span className="text-muted-foreground">End: </span>
              {format(new Date(project.endDate), 'PP')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
