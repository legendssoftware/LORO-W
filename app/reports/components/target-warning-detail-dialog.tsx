'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { TargetWarningsPayload } from '@/api/endpoints/user';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  getPerformanceWarningCopy,
  type PerformanceWarningLevel,
} from '@/lib/performance-warning-content';
import {
  getTargetWarningHistory,
  summarizeTargetWarnings,
} from '@/lib/target-warnings-summary';

const utcShortDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function formatIso(iso: string | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return utcShortDateTime.format(d);
}

function warningLevelBadgeClass(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200';
    case 2:
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200';
    case 3:
      return 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200';
  }
}

export interface TargetWarningDetailDialogProps {
  employeeName: string;
  targetWarnings: TargetWarningsPayload | null | undefined;
}

export function TargetWarningDetailDialog({
  employeeName,
  targetWarnings,
}: TargetWarningDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const history = getTargetWarningHistory(targetWarnings);
  const summary = summarizeTargetWarnings(targetWarnings);
  const disabled = history.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-violet-600 hover:text-violet-700"
          disabled={disabled}
          aria-label={
            disabled
              ? 'No performance warning history'
              : `View performance warning details for ${employeeName}`
          }
        >
          <Info className="size-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(92vh,760px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-start">
          <DialogTitle className="text-base">Performance warnings</DialogTitle>
          <DialogDescription>
            {employeeName} — full warning history from first to last tier.
          </DialogDescription>
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <Badge variant="secondary" className="tabular-nums">
              Issued {summary.totalIssued}
            </Badge>
            <Badge variant="secondary" className="tabular-nums">
              Ack {summary.totalAcknowledged}
            </Badge>
            <Badge variant="secondary" className="tabular-nums">
              Total {summary.totalIssued}
            </Badge>
            {summary.pendingCount > 0 ? (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
              >
                Pending acknowledgement
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ol className="space-y-4">
            {history.map((entry, index) => {
              const copy = getPerformanceWarningCopy(
                entry.level as PerformanceWarningLevel,
                employeeName
              );
              const acknowledged = Boolean(entry.acknowledgedAt);
              return (
                <li
                  key={`${entry.level}-${entry.issuedAt}-${index}`}
                  className="rounded-lg border border-border bg-muted/20 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'rounded-full font-mono tabular-nums',
                        warningLevelBadgeClass(entry.level)
                      )}
                    >
                      L{entry.level}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {entry.source.replace('_', ' ')}
                    </Badge>
                    {acknowledged ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                      >
                        Acknowledged
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                      >
                        Pending
                      </Badge>
                    )}
                  </div>
                  <dl className="mb-3 grid gap-1 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">Issued</dt>
                      <dd className="tabular-nums">{formatIso(entry.issuedAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">Acknowledged</dt>
                      <dd className="tabular-nums">{formatIso(entry.acknowledgedAt)}</dd>
                    </div>
                  </dl>
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-snug">{copy.title}</p>
                    <p className="text-muted-foreground whitespace-pre-line text-sm">{copy.intro}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {copy.bullets.slice(0, 4).map((line) => (
                        <li key={line} className="text-foreground/90">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>

          <Collapsible open={rawOpen} onOpenChange={setRawOpen} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs text-muted-foreground"
              >
                <ChevronDown
                  className={cn('size-4 transition-transform', rawOpen && 'rotate-180')}
                  aria-hidden
                />
                Raw JSON
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(targetWarnings ?? null, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}
