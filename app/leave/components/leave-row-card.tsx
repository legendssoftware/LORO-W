'use client';

import { formatLeaveDate, formatLeaveDuration, formatLeaveStatus, formatLeaveType, leavePersonName, leaveStatusClassName } from '@/app/leave/lib/leave-display';
import type { LeaveRecord } from '@/api/types/leave';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeaveRowCardSkeleton() {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardContent className="flex min-h-[168px] flex-col justify-between p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
        </div>
        <Skeleton className="mt-3 h-6 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function LeaveRowCard({
  leave,
  onOpen,
}: {
  leave: LeaveRecord;
  onOpen: (leave: LeaveRecord) => void;
}) {
  const person = leavePersonName(leave.owner);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(leave)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(leave);
        }
      }}
      className="h-full cursor-pointer rounded-lg border border-border bg-background transition-colors hover:border-violet-300"
    >
      <CardContent className="flex h-full min-h-[168px] flex-col justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {formatLeaveType(leave.leaveType)}
            </p>
            <Badge variant="outline" className={cn('shrink-0', leaveStatusClassName(leave.status))}>
              {formatLeaveStatus(leave.status)}
            </Badge>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{person}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            <span>
              {formatLeaveDate(leave.startDate)} – {formatLeaveDate(leave.endDate)}
            </span>
          </p>
        </div>
        <p className="text-sm font-medium text-foreground">
          {formatLeaveDuration(leave.duration, leave.isHalfDay)}
          {leave.isHalfDay ? ' · Half day' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
