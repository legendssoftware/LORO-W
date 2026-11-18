'use client';

import { format } from 'date-fns';
import { AlertTriangle, User } from 'lucide-react';
import type { WarningRecord, WarningSeverity } from '@/api/types/warnings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const SEVERITY_BADGE: Record<WarningSeverity, string> = {
  LOW: 'border-transparent bg-emerald-600 text-white',
  MEDIUM: 'border-transparent bg-amber-500 text-white',
  HIGH: 'border-transparent bg-red-600 text-white',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'border-amber-500 text-amber-700 dark:text-amber-400',
  EXPIRED: 'border-border text-muted-foreground',
  REVOKED: 'border-border text-muted-foreground',
};

export function warningPersonName(person?: WarningRecord['owner']): string {
  const name = `${person?.name ?? ''} ${person?.surname ?? ''}`.trim();
  return name || person?.email || '—';
}

export function formatWarningDay(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'd MMM yyyy');
}

export function WarningRowCardSkeleton() {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardContent className="flex min-h-[168px] flex-col justify-between p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function WarningRowCard({
  warning,
  onOpen,
}: {
  warning: WarningRecord;
  onOpen: (warning: WarningRecord) => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(warning)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(warning);
        }
      }}
      className="h-full cursor-pointer rounded-lg border border-border bg-background transition-colors hover:border-violet-300"
    >
      <CardContent className="flex h-full min-h-[168px] flex-col justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
              {warning.severity}
            </p>
            <Badge variant="outline" className={cn('shrink-0', STATUS_BADGE[warning.status])}>
              {warning.status}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-foreground">{warning.reason}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{warningPersonName(warning.owner)}</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={cn(SEVERITY_BADGE[warning.severity])}>
            {warning.severity}
          </Badge>
          <p className="text-xs text-muted-foreground">Expires {formatWarningDay(warning.expiresAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
