'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { useCalculateRoutesMutation, useOptimizedRoutes, useSessionSync, useUsers } from '@/api/hooks';
import { canAccessVisualiser } from '@/lib/access';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  localPickerDateFromUtcCalendarDate,
  utcCalendarDateFromLocalPickerDate,
  utcTomorrow,
} from '@/lib/utils/overview-daily-summary';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { OptimizedRoute } from '@/api/types/tasks';
import { CalendarIcon } from '@/lib/icons';
import { ROUTE_PLANNING_EMPTY } from '@/lib/route-planning-note';

interface PlanningRoutesMapProps {
  onOpenTask?: (taskId: number) => void;
}

function routeRepName(route: OptimizedRoute, userNameById: Map<number, string>): string {
  const fromRoute = route.assigneeName?.trim();
  if (fromRoute) return fromRoute;
  const fromUsers = userNameById.get(Number(route.userId));
  if (fromUsers) return fromUsers;
  return `Rep #${route.userId}`;
}

/**
 * Route planning list (no embedded map — maps live on /visualiser only).
 */
export function PlanningRoutesMap({ onOpenTask }: PlanningRoutesMapProps) {
  const { backendUserData } = useSessionSync();
  const showVisualiserLink = canAccessVisualiser(backendUserData?.accessLevel);
  const [routeDate, setRouteDate] = useState<Date>(() => utcTomorrow());
  const [routeSearch, setRouteSearch] = useState('');
  const dateYmd = formatUtcYmd(routeDate);
  const routesQuery = useOptimizedRoutes(dateYmd);
  const calculateMutation = useCalculateRoutesMutation();
  const { data: users = [] } = useUsers({ page: 1, limit: 200 });

  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of users) {
      if (u.uid == null) continue;
      const fullName = [u.name, u.surname].filter(Boolean).join(' ').trim();
      if (fullName) m.set(Number(u.uid), fullName);
    }
    return m;
  }, [users]);

  const routes = routesQuery.data ?? [];

  const filteredRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    if (!query) return routes;
    return routes.filter((route) => {
      const repName = routeRepName(route, userNameById).toLowerCase();
      const clients = route.stops
        .map((stop) =>
          [stop.clientName, stop.location?.address].filter(Boolean).join(' ')
        )
        .join(' ')
        .toLowerCase();
      return (
        repName.includes(query) ||
        clients.includes(query) ||
        String(route.userId).includes(query)
      );
    });
  }, [routeSearch, routes, userNameById]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-tour="planning-routes">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="size-4" />
              {formatUtcCalendarLabel(routeDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={localPickerDateFromUtcCalendarDate(routeDate)}
              defaultMonth={localPickerDateFromUtcCalendarDate(routeDate)}
              onSelect={(d) => {
                if (!d) return;
                setRouteDate(utcCalendarDateFromLocalPickerDate(d));
              }}
            />
          </PopoverContent>
        </Popover>
        <Input
          value={routeSearch}
          onChange={(event) => setRouteSearch(event.target.value)}
          placeholder="Search reps or clients…"
          aria-label="Search routes by rep or client"
          className="h-9 w-full min-w-[12rem] sm:w-56"
        />
        <div className="flex flex-wrap items-center gap-2">
          {showVisualiserLink ? (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/visualiser?date=${dateYmd}`}>
                <ExternalLink className="size-4" />
                Open visualiser
              </Link>
            </Button>
          ) : null}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {routesQuery.isLoading ? (
          <div className="flex h-[240px] items-center justify-center rounded-lg border">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
            <MapPin className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No routes for this day</p>
            <p className="max-w-md text-xs text-muted-foreground">{ROUTE_PLANNING_EMPTY}</p>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm font-medium">No routes match that search</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Try another rep name or client.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoutes.map((route) => (
              <RouteSummaryCard
                key={route.routeUid ?? `${route.userId}-${route.stops[0]?.taskId ?? 'route'}`}
                route={route}
                dateYmd={dateYmd}
                repName={routeRepName(route, userNameById)}
                onOpenTask={onOpenTask}
                showMapLink={showVisualiserLink}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RouteSummaryCard({
  route,
  dateYmd,
  repName,
  onOpenTask,
  showMapLink,
}: {
  route: OptimizedRoute;
  dateYmd: string;
  repName: string;
  onOpenTask?: (taskId: number) => void;
  showMapLink: boolean;
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
                {stop.clientName?.trim() || `Client #${stop.clientId}`}
                {stop.location.address ? ` · ${stop.location.address}` : ''}
              </button>
            ) : (
              <span>
                {stop.clientName?.trim() || `Client #${stop.clientId}`}
                {stop.location.address ? ` · ${stop.location.address}` : ''}
              </span>
            )}
          </li>
        ))}
      </ol>
      {showMapLink ? (
        <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5" asChild>
          <Link href={`/visualiser?date=${dateYmd}&user=${route.userId}`}>
            <MapPin className="size-4" />
            Open on map
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
