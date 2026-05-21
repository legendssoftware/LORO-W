'use client';

import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, FolderKanban } from 'lucide-react';
import type { ClientProject } from '@/api/types/client-portal';
import { formatZar } from '@/lib/client-portal-utils';
import {
  formatProjectLabel,
  hasProjectBudget,
  isProjectOverBudget,
  projectPriorityClass,
  projectStatusClass,
} from '@/lib/project-display';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

function FinancialCell({
  label,
  amount,
}: {
  label: string;
  amount?: number | null;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold">
        {amount != null ? formatZar(amount) : '—'}
      </p>
    </div>
  );
}

export function ProjectCard({
  project,
  onClick,
}: {
  project: ClientProject;
  onClick: () => void;
}) {
  const name = project.name ?? `Project #${project.uid}`;
  const overBudget = isProjectOverBudget(project);
  const showBudgetIndicator = hasProjectBudget(project);

  return (
    <button
      type="button"
      className="text-left w-full"
      onClick={onClick}
    >
      <Card className="flex h-full flex-col overflow-hidden transition-colors hover:bg-muted/30">
        <div className="relative flex h-32 items-center justify-center bg-muted">
          <FolderKanban className="size-12 text-violet-600/80" aria-hidden />
          {project.status && (
            <Badge
              className={`absolute left-2 top-2 text-[10px] capitalize ${projectStatusClass(project.status)}`}
            >
              {formatProjectLabel(project.status)}
            </Badge>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col gap-2 px-3 pt-2 pb-3">
          <CardTitle className="text-sm font-medium leading-snug line-clamp-2">
            {name}
          </CardTitle>

          {(project.priority || project.type) && (
            <div className="flex flex-wrap gap-1">
              {project.priority && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-normal capitalize ${projectPriorityClass(project.priority)}`}
                >
                  {formatProjectLabel(project.priority)}
                </Badge>
              )}
              {project.type && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {formatProjectLabel(project.type)}
                </Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <FinancialCell label="Budget" amount={project.budget} />
            <FinancialCell label="Spent" amount={project.currentSpent} />
            <FinancialCell label="Value" amount={project.value} />
            <FinancialCell label="Total cost" amount={project.totalCost} />
          </div>

          {showBudgetIndicator && (
            <Badge
              className={
                overBudget
                  ? 'w-fit gap-1 bg-red-100 text-red-800 text-[10px]'
                  : 'w-fit gap-1 bg-green-100 text-green-800 text-[10px]'
              }
            >
              {overBudget ? (
                <>
                  <AlertTriangle className="size-3" aria-hidden />
                  Over budget
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3" aria-hidden />
                  On budget
                </>
              )}
            </Badge>
          )}

          {project.createdAt && (
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(project.createdAt), 'dd MMM yyyy')}
            </p>
          )}
          {project.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
              {project.description}
            </p>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
