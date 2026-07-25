'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useCalculateRoutesMutation, useOptimizedRoutes, useUsers } from '@/api/hooks';
import { formatUtcYmd, utcToday } from '@/lib/utils/overview-daily-summary';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { OptimizedRoute, Task } from '@/api/types/tasks';
import { CalendarIcon } from '@/lib/icons';

const PlanningRoutesMapInner = dynamic(
  () =>
    import('./planning-routes-map-inner').then((m) => m.PlanningRoutesMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface PlanningRoutesMapProps {
  onOpenTask?: (taskId: number) => void;
}

export function PlanningRoutesMap({ onOpenTask }: PlanningRoutesMapProps) {
  const [routeDate, setRouteDate] = useState<Date>(() => utcToday());
  const dateYmd = formatUtcYmd(routeDate);
  const routesQuery = useOptimizedRoutes(dateYmd);
  const calculateMutation = useCalculateRoutesMutation();
  const { data: users = [] } = useUsers({ page: 1, limit: 200 });

  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of users) {
      if (u.uid != null) {
        m.set(u.uid, [u.name, u.surname].filter(Boolean).join(' ') || `User ${u.uid}`);
      }
    }
    return m;
  }, [users]);

  const routes = routesQuery.data ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-tour="planning-routes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="size-4" />
              {format(routeDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={routeDate}
              onSelect={(d) => d && setRouteDate(d)}
            />
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={calculateMutation.isPending}
          onClick={() => calculateMutation.mutate(dateYmd)}
        >
          {calculateMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Recalculate routes
        </Button>
      </div>

      {routesQuery.isLoading ? (
        <div className="flex h-[420px] items-center justify-center rounded-lg border">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
          <MapPin className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No routes for this day</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Assign tasks with clients and ensure reps have a branch with coordinates.
            Then click Recalculate routes.
          </p>
        </div>
      ) : (
        <>
          <PlanningRoutesMapInner routes={routes} onStopClick={onOpenTask} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <RouteSummaryCard
                key={route.userId}
                route={route}
                repName={userNameById.get(route.userId) ?? `Rep #${route.userId}`}
                onOpenTask={onOpenTask}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RouteSummaryCard({
  route,
  repName,
  onOpenTask,
}: {
  route: OptimizedRoute;
  repName: string;
  onOpenTask?: (taskId: number) => void;
}) {
  const km = route.totalDistance > 1000
    ? `${(route.totalDistance / 1000).toFixed(1)} km`
    : `${Math.round(route.totalDistance)} m`;
  const mins = Math.round(route.estimatedDuration / 60);

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium">{repName}</p>
      <p className="text-xs text-muted-foreground">
        {route.stops.length} stops · {km} · ~{mins} min
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
        {route.stops.map((stop, i) => (
          <li key={`${stop.taskId}-${stop.clientId}-${i}`}>
            {onOpenTask ? (
              <button
                type="button"
                className="text-left text-violet-700 hover:underline dark:text-violet-400"
                onClick={() => onOpenTask(stop.taskId)}
              >
                Task #{stop.taskId} · Client #{stop.clientId}
              </button>
            ) : (
              <span>
                Task #{stop.taskId} · Client #{stop.clientId}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
