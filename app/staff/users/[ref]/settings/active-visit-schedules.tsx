'use client';

import { format, parseISO } from 'date-fns';
import { CalendarClock, MapPin, Route } from 'lucide-react';
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

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`;
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
            {slot.route ? (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Route className="size-3.5 shrink-0" aria-hidden />
                <span>
                  Driving route · {formatDistance(slot.route.totalDistanceMeters)} ·{' '}
                  {formatDuration(slot.route.totalDurationSeconds)} · {slot.route.stopCount} stop
                  {slot.route.stopCount === 1 ? '' : 's'}
                </span>
              </p>
            ) : null}
            <ul className="mt-2 space-y-1">
              {slot.tasks.map((task) => (
                <li
                  key={task.uid}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
                >
                  {task.hasAddress ? (
                    <MapPin className="size-3.5 shrink-0" aria-label="Has address" />
                  ) : null}
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
