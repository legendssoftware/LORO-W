'use client';

import { format, parseISO } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import { Loader2Icon } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { useUserVisitPlanSchedules } from '@/api/hooks/use-user-visit-plan-schedules';

function formatVisitDateLabel(visitDate: string): string {
  if (!visitDate) return 'No date';
  try {
    return format(parseISO(visitDate), 'EEE, d MMM yyyy');
  } catch {
    return visitDate;
  }
}

function formatTaskStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export interface ActiveVisitSchedulesProps {
  userRef: string | number;
}

export function ActiveVisitSchedules({ userRef }: ActiveVisitSchedulesProps) {
  const { data, isLoading } = useUserVisitPlanSchedules(userRef);

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading active visit schedule…
      </div>
    );
  }

  if (!data?.totalActiveTasks) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarClock className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Active visit schedule</p>
        <Badge variant="secondary">{data.totalActiveTasks} visit(s)</Badge>
      </div>

      <div className="space-y-2">
        {data.slots.map((slot) => (
          <div
            key={slot.visitDate || 'undated'}
            className="rounded-md border bg-muted/20 p-3"
          >
            <p className="text-sm font-medium">
              {formatVisitDateLabel(slot.visitDate)} — {slot.tasks.length} client
              {slot.tasks.length === 1 ? '' : 's'}
            </p>
            <ul className="mt-2 space-y-1">
              {slot.tasks.map((task) => (
                <li
                  key={task.uid}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
                >
                  <span className="text-foreground">
                    {task.clientName ?? task.title}
                  </span>
                  {task.repetitionSeriesId && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Recurring
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {formatTaskStatus(task.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
