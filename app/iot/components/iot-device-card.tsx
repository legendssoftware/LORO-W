'use client';

import type { IotDevice } from '@/api/types/iot';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEnumLabel } from '@/lib/format-enum-label';
import { cn } from '@/lib/utils';
import { getBranchDisplayLabel } from '@/api/types/branch';
import { Cpu, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

const STATUS_BADGE: Record<
  string,
  { className: string }
> = {
  online: {
    className: 'bg-green-100 text-green-800 border border-green-200/80',
  },
  offline: {
    className: 'bg-slate-100 text-slate-800 border border-slate-200/80',
  },
  maintenance: {
    className: 'bg-amber-100 text-amber-900 border border-amber-200/80',
  },
  disconnected: {
    className: 'bg-red-100 text-red-800 border border-red-200/80',
  },
};

function safeFormatTs(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'MMM d, yyyy HH:mm');
  } catch {
    return null;
  }
}

export function IotDeviceCardSkeleton() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Card className="gap-0 py-0 rounded-lg border border-border bg-background">
        <CardContent className="flex items-start gap-2 p-2">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[min(100%,12rem)] rounded-md" />
            <Skeleton className="h-3 w-[min(100%,9rem)] rounded-md" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="rounded-lg border border-border bg-background min-h-[220px]">
      <CardContent className="flex flex-col flex-1 justify-between p-4 min-h-[220px]">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-full max-w-[180px] rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
        </div>
        <div className="mt-3 space-y-1 shrink-0">
          <Skeleton className="h-4 w-full max-w-[min(100%,20rem)] rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function IotDeviceCard({
  device,
  onClick,
}: {
  device: IotDevice;
  onClick?: () => void;
}) {
  const isMobile = useIsMobile();
  const branchLabel = getBranchDisplayLabel(device.branch ?? undefined);
  const statusStyle =
    STATUS_BADGE[device.currentStatus] ?? STATUS_BADGE.offline;
  const lastOpen = safeFormatTs(device.analytics?.lastOpenAt ?? null);

  const inner = (
    <>
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Cpu className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground text-sm sm:text-base">
                {device.deviceID}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {device.deviceTag}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn('text-[11px] font-medium', statusStyle.className)}
          >
            {formatEnumLabel(device.currentStatus)}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-medium border-border">
            {formatEnumLabel(device.deviceType)}
          </Badge>
        </div>

        <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
          <p className="flex items-start gap-1.5 min-w-0">
            <MapPin className="size-3.5 shrink-0 mt-0.5" aria-hidden />
            <span className="line-clamp-2">{device.devicLocation}</span>
          </p>
          {branchLabel ? (
            <p className="truncate">Branch: {branchLabel}</p>
          ) : null}
          <p className="truncate font-mono text-[11px]">
            {device.deviceIP}:{device.devicePort}
          </p>
        </div>
      </div>

      <div className="mt-3 shrink-0 border-t border-border/60 pt-3 text-xs text-muted-foreground space-y-0.5">
        <p>
          Opens / closes / total:{' '}
          <span className="font-medium text-foreground">
            {device.analytics?.openCount ?? 0} / {device.analytics?.closeCount ?? 0} /{' '}
            {device.analytics?.totalCount ?? 0}
          </span>
        </p>
        <p className="truncate">Last open: {lastOpen ?? '—'}</p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Card
        className={cn(
          'relative gap-0 py-0 rounded-lg',
          onClick && 'cursor-pointer transition-colors hover:opacity-90'
        )}
        {...(onClick ? { onClick } : {})}
      >
        <CardContent className="flex flex-col gap-2 p-3">{inner}</CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'rounded-lg border border-border bg-background min-h-[220px]',
        onClick && 'cursor-pointer transition-shadow hover:shadow-sm'
      )}
      {...(onClick ? { onClick } : {})}
    >
      <CardContent className="flex flex-col flex-1 justify-between p-4 min-h-[220px]">
        {inner}
      </CardContent>
    </Card>
  );
}
