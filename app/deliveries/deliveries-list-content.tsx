'use client';

import { useEffect, useMemo, useState } from 'react';
import { Fuel, MapPin, PackageCheck, PackagePlus, PackageX, Route, Truck } from 'lucide-react';
import {
  filterDeliveries,
  useAssetsInfinite,
  useDeliveries,
  useDeliveryDrivers,
  useSessionSync,
  useTokenReady,
} from '@/api/hooks';
import type { DeliveryStatus, DeliverySummary } from '@/api/types/epod';
import { canDispatchDeliveries, canViewOrganisationDeliveries } from '@/lib/access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { AssignDeliveryDialog } from '@/app/deliveries/assign-delivery-dialog';
import {
  CancelDeliveryDialog,
  type CancelDeliveryTarget,
} from '@/app/deliveries/cancel-delivery-form';
import { DeliveryDetailDialog } from '@/app/deliveries/delivery-detail-dialog';
import { DeliveriesFiltersBar } from '@/app/deliveries/deliveries-filters-bar';
import {
  MarkLoadedDialog,
  type MarkLoadedRouteTarget,
} from '@/app/deliveries/mark-loaded-dialog';
import {
  PlanRouteDialog,
  type PlanRouteTarget,
} from '@/app/deliveries/plan-route-dialog';
import {
  deliveryStatusClassName,
  formatArrivalWindow,
  formatDeliveryStatus,
  formatDeliveryTimestamp,
  formatWeightKg,
  loadedReadyButtonClassName,
  loadingCancelledButtonClassName,
  markLoadedButtonClassName,
  routePlannedButtonClassName,
} from '@/app/deliveries/format';
import {
  VisitsListPagination,
  readStoredPageSize,
  type VisitsPageSize,
} from '@/app/visits/components/visits-list-pagination';
import { useTranslation } from 'react-i18next';

const ANY_VALUE = 'all';
const DELIVERIES_PAGE_SIZE_KEY = 'loro:deliveries-page-size';

/** Open stops with a driver, day, and route can be Mark loaded from the row. */
function canMarkDeliveryReady(row: DeliverySummary): boolean {
  return (
    (row.status === 'assigned' || row.status === 'in_progress') &&
    row.routeCode.trim().length > 0 &&
    row.driverUid > 0 &&
    row.scheduledDate.trim().length > 0
  );
}

/** Same key as Mark loaded — Google can propose a stop order for open routes. */
function canPlanRoute(row: DeliverySummary): boolean {
  return canMarkDeliveryReady(row);
}

interface DeliveryRouteGroup {
  key: string;
  primary: DeliverySummary;
  stops: DeliverySummary[];
  displayStops: DeliverySummary[];
  status: DeliveryStatus;
  totalWeightKg: number | null;
  invoiceLabels: string[];
  clientNames: string[];
  avgRating: number | null;
  allLoaded: boolean;
  loadedAt: string | null;
  anyPlanned: boolean;
  canMarkReady: boolean;
  canPlan: boolean;
}

/**
 * Groups deliveries sharing the same truck/driver route and scheduled day into a single table row,
 * so multi-stop truck loads show once and open all their invoices when clicked.
 */
function groupDeliveriesByRoute(deliveries: readonly DeliverySummary[]): DeliveryRouteGroup[] {
  const buckets = new Map<string, DeliverySummary[]>();
  const order: string[] = [];

  for (const row of deliveries) {
    const route = row.routeCode.trim();
    const day = row.scheduledDate.trim();
    const key =
      route.length > 0 && row.driverUid > 0 && day.length > 0
        ? `route:${row.driverUid}:${route}:${day}`
        : `uid:${row.uid}`;
    const list = buckets.get(key);
    if (list) {
      list.push(row);
    } else {
      buckets.set(key, [row]);
      order.push(key);
    }
  }

  return order.map((key) => {
    const rawStops = buckets.get(key) ?? [];
    const stops = rawStops.slice().sort((a, b) => {
      const seqA = a.stopSequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.stopSequence ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return a.uid - b.uid;
    });
    const activeStops = stops.filter((s) => s.status !== 'cancelled');
    const displayStops = activeStops.length > 0 ? activeStops : stops;
    const primary =
      displayStops.find((s) => s.status === 'in_progress' || s.status === 'assigned') ??
      displayStops[0];

    let status: DeliveryStatus = 'cancelled';
    if (displayStops.some((s) => s.status === 'in_progress')) status = 'in_progress';
    else if (displayStops.some((s) => s.status === 'assigned')) status = 'assigned';
    else if (displayStops.some((s) => s.status === 'recorded')) status = 'recorded';

    const weightSum = displayStops.reduce((sum, s) => {
      const w = s.totalWeightKg;
      return w != null && Number.isFinite(w) && w > 0 ? sum + w : sum;
    }, 0);
    const totalWeightKg = weightSum > 0 ? Math.round(weightSum * 100) / 100 : null;

    const invoiceLabels = Array.from(
      new Set(
        displayStops
          .map((s) => (s.invoiceNumber || s.orderNumber || '').trim())
          .filter((v) => v.length > 0),
      ),
    );
    const clientNames = Array.from(
      new Set(displayStops.map((s) => (s.clientName || '').trim()).filter((v) => v.length > 0)),
    );
    const rated = displayStops
      .map((s) => s.ratingScore)
      .filter((r): r is number => r != null && Number.isFinite(r));
    const avgRating =
      rated.length > 0
        ? Math.round((rated.reduce((sum, r) => sum + r, 0) / rated.length) * 10) / 10
        : null;

    const allLoaded = displayStops.length > 0 && displayStops.every((s) => s.routeReady);
    const loadedAt =
      displayStops
        .map((s) => s.routeReadyAt)
        .filter((v): v is string => Boolean(v))
        .sort()
        .at(-1) ?? null;
    const anyPlanned = displayStops.some((s) => Boolean(s.routePlanned));
    const canMarkReady = displayStops.some((s) => canMarkDeliveryReady(s) && !s.routeReady);
    const canPlan = displayStops.some((s) => canPlanRoute(s));

    return {
      key,
      primary,
      stops,
      displayStops,
      status,
      totalWeightKg,
      invoiceLabels,
      clientNames,
      avgRating,
      allLoaded,
      loadedAt,
      anyPlanned,
      canMarkReady,
      canPlan,
    };
  });
}

export function DeliveriesListContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const canDispatch = canDispatchDeliveries(backendUserData);
  const canViewOrganisation = canViewOrganisationDeliveries(backendUserData);

  const [date, setDate] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(ANY_VALUE);
  const [driverUid, setDriverUid] = useState<string>(ANY_VALUE);
  const [vehicleAssetUid, setVehicleAssetUid] = useState<string>(ANY_VALUE);
  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CancelDeliveryTarget | null>(null);
  const [markLoadedTarget, setMarkLoadedTarget] = useState<MarkLoadedRouteTarget | null>(null);
  const [planRouteTarget, setPlanRouteTarget] = useState<PlanRouteTarget | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() => readStoredPageSize(DELIVERIES_PAGE_SIZE_KEY));

  const query = useDeliveries(
    {
      ...(date ? { date } : {}),
      ...(status !== ANY_VALUE ? { status: status as DeliveryStatus } : {}),
      ...(canViewOrganisation && driverUid !== ANY_VALUE ? { driverUid: Number(driverUid) } : {}),
    },
    isTokenReady,
  );
  const driversQuery = useDeliveryDrivers(isTokenReady && canViewOrganisation);
  const trucksQuery = useAssetsInfinite({
    scope: 'org',
    category: 'VEHICLE',
    enabled: isTokenReady && canViewOrganisation,
  });
  const trucks = trucksQuery.data ?? [];

  const rows = useMemo(() => {
    const searched = filterDeliveries(query.data?.deliveries ?? [], search);
    if (vehicleAssetUid === ANY_VALUE) return searched;
    const selectedTruckUid = Number(vehicleAssetUid);
    const selectedTruck = trucks.find((truck) => truck.uid === selectedTruckUid);
    const selectedPlate = selectedTruck?.registrationPlate?.trim().toLowerCase() ?? '';
    return searched.filter((row) => {
      if (row.vehicleAssetUid != null) return row.vehicleAssetUid === selectedTruckUid;
      if (selectedPlate && row.truckRegistration?.trim()) {
        return row.truckRegistration.trim().toLowerCase().includes(selectedPlate);
      }
      return false;
    });
  }, [query.data?.deliveries, search, vehicleAssetUid, trucks]);
  const groupedRows = useMemo(() => groupDeliveriesByRoute(rows), [rows]);
  const hasSearch = search.trim().length > 0;
  const total = groupedRows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return groupedRows.slice(start, start + pageSize);
  }, [groupedRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [date, status, driverUid, vehicleAssetUid, pageSize, search]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handlePageSizeChange(size: VisitsPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(DELIVERIES_PAGE_SIZE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
      <div className="mb-6 shrink-0" data-tour="deliveries-page-header">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('pages.deliveries.title')}</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {t('pages.deliveries.description')}
        </p>
      </div>

      {canDispatch ? <AssignDeliveryDialog open={assignOpen} onOpenChange={setAssignOpen} /> : null}
      {canDispatch ? (
        <MarkLoadedDialog
          open={markLoadedTarget != null}
          onOpenChange={(open) => {
            if (!open) setMarkLoadedTarget(null);
          }}
          target={markLoadedTarget}
          deliveries={query.data?.deliveries ?? []}
        />
      ) : null}
      {canDispatch ? (
        <PlanRouteDialog
          open={planRouteTarget != null}
          onOpenChange={(open) => {
            if (!open) setPlanRouteTarget(null);
          }}
          target={planRouteTarget}
        />
      ) : null}
      <DeliveryDetailDialog
        uid={selectedUid}
        open={selectedUid != null}
        onOpenChange={(open) => {
          if (!open) setSelectedUid(null);
        }}
        onRequestCancel={(target) => {
          setSelectedUid(null);
          setCancelTarget(target);
        }}
      />
      {canDispatch ? (
        <CancelDeliveryDialog
          target={cancelTarget}
          open={cancelTarget != null}
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
        />
      ) : null}

      <DeliveriesFiltersBar
        date={date}
        onDateChange={setDate}
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        showDriverFilter={canViewOrganisation}
        driverUid={driverUid}
        onDriverUidChange={setDriverUid}
        drivers={driversQuery.data ?? []}
        showTruckFilter={canViewOrganisation}
        vehicleAssetUid={vehicleAssetUid}
        onVehicleAssetUidChange={setVehicleAssetUid}
        trucks={trucks}
        actions={
          canDispatch ? (
            <Button
              type="button"
              className={cn(
                'h-9 shrink-0 gap-2 border-0 !rounded px-4',
                'bg-violet-600 text-white hover:bg-violet-700',
                'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
                '[&_svg]:text-white focus-visible:ring-violet-500/40',
              )}
              onClick={() => setAssignOpen(true)}
              data-tour="deliveries-assign"
            >
              <PackagePlus className="size-4" />
              Assign delivery
            </Button>
          ) : null
        }
      />

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
        {...(query.isLoading ? {} : { 'data-tour': 'deliveries-list' })}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.isLoading ? (
            <div className="flex h-full min-h-[240px] w-full items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : null}
          {query.isError ? (
            <p className="text-destructive p-4 text-sm">{getQueryErrorMessage(query.error)}</p>
          ) : null}

          {!query.isLoading && !query.isError && rows.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              {hasSearch ? 'No deliveries match this search.' : 'No deliveries match these filters.'}
            </p>
          ) : null}

          {pageRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tables.delivery')}</TableHead>
                  <TableHead>{t('tables.invoice')}</TableHead>
                  <TableHead>{t('tables.client')}</TableHead>
                  <TableHead>{t('tables.route')}</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>{t('tables.status')}</TableHead>
                  <TableHead>{t('tables.rating')}</TableHead>
                  <TableHead>Weight</TableHead>
                  {canDispatch ? <TableHead>Loading Status</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((group) => {
                  const row = group.primary;
                  const stopCount = group.displayStops.length;
                  const isMultiStop = stopCount > 1;
                  return (
                    <TableRow
                      key={group.key}
                      tabIndex={0}
                      className="cursor-pointer"
                      aria-label={
                        isMultiStop
                          ? `Open ${row.deliveryNumber} (${stopCount} invoices)`
                          : `Open ${row.deliveryNumber}`
                      }
                      onClick={() => setSelectedUid(row.uid)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedUid(row.uid);
                        }
                      }}
                    >
                      <TableCell>
                        <span className="font-medium">
                          {row.deliveryNumber}
                          {isMultiStop ? (
                            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                              (+{stopCount - 1})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground block text-xs">{row.scheduledDate}</span>
                      </TableCell>
                      <TableCell>
                        {group.invoiceLabels.length === 0 ? (
                          '—'
                        ) : group.invoiceLabels.length === 1 ? (
                          group.invoiceLabels[0]
                        ) : (
                          <>
                            <span>{group.invoiceLabels[0]}</span>
                            <span className="text-muted-foreground block text-xs">
                              +{group.invoiceLabels.length - 1} more ({group.invoiceLabels.length}{' '}
                              invoices)
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {group.clientNames.length === 0 ? (
                          '—'
                        ) : group.clientNames.length === 1 ? (
                          <>
                            {group.clientNames[0]}
                            {!isMultiStop && row.clientAddress ? (
                              <span className="text-muted-foreground block text-xs">
                                {row.clientAddress}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <span>{group.clientNames[0]}</span>
                            <span className="text-muted-foreground block text-xs">
                              +{group.clientNames.length - 1} more clients
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{row.routeCode || '—'}</span>
                        {isMultiStop ? (
                          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            {stopCount} stops
                          </span>
                        ) : row.stopSequence != null ? (
                          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            Stop {row.stopSequence}
                          </span>
                        ) : null}
                        {row.truckRegistration?.trim() ? (
                          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                            <Truck className="size-3 shrink-0" aria-hidden />
                            {row.truckRegistration.trim()}
                          </span>
                        ) : null}
                        {row.departureFuelLitres != null ? (
                          <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                            <Fuel className="size-3 shrink-0" aria-hidden />
                            {row.departureFuelLitres} L filled
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatArrivalWindow(
                          row.estimatedWindowStart,
                          row.estimatedWindowEnd,
                          row.scheduledDate,
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={deliveryStatusClassName(group.status)}>
                          {formatDeliveryStatus(group.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {group.avgRating == null ? '—' : `${group.avgRating}/5`}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatWeightKg(group.totalWeightKg)}
                      </TableCell>
                      {canDispatch ? (
                        <TableCell>
                          <div className="flex flex-wrap items-start gap-2">
                            {group.allLoaded ? (
                              <div className="flex flex-col gap-0.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn('h-9', loadedReadyButtonClassName)}
                                  disabled
                                  aria-label="Loaded — warehouse load already acknowledged"
                                  title={
                                    group.loadedAt
                                      ? `Loaded at ${formatDeliveryTimestamp(group.loadedAt)}`
                                      : 'Warehouse load is marked loaded and ready'
                                  }
                                >
                                  <PackageCheck className="size-4 shrink-0" aria-hidden />
                                  Loaded
                                </Button>
                                {group.loadedAt ? (
                                  <span className="text-muted-foreground text-[11px] leading-tight">
                                    {formatDeliveryTimestamp(group.loadedAt)}
                                  </span>
                                ) : null}
                              </div>
                            ) : group.status === 'cancelled' ? (
                              <Button
                                type="button"
                                variant="outline"
                                className={cn('h-9', loadingCancelledButtonClassName)}
                                disabled
                                aria-label="Loading cancelled — delivery was cancelled before loading"
                                title="Delivery was cancelled before warehouse loading"
                              >
                                <PackageX className="size-4 shrink-0" aria-hidden />
                                Loading cancelled
                              </Button>
                            ) : group.canMarkReady ? (
                              <Button
                                type="button"
                                variant="outline"
                                className={cn('h-9', markLoadedButtonClassName)}
                                aria-label="Mark as Loaded — warehouse load acknowledgment"
                                title="Opens the invoice load checklist for this route, then texts the customer and driver"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setMarkLoadedTarget({
                                    driverUid: row.driverUid,
                                    routeCode: row.routeCode,
                                    scheduledDate: row.scheduledDate,
                                  });
                                }}
                              >
                                <PackageCheck className="size-4 shrink-0" aria-hidden />
                                Mark as Loaded
                              </Button>
                            ) : null}
                            {group.canPlan ? (
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  'h-9',
                                  group.anyPlanned
                                    ? routePlannedButtonClassName
                                    : markLoadedButtonClassName,
                                )}
                                aria-label={
                                  group.anyPlanned
                                    ? 'Route planned — click to review or re-plan'
                                    : 'Plan route — Google-optimized stop order for all stops on this truck'
                                }
                                title={
                                  group.anyPlanned
                                    ? 'Route order has been planned and saved. Click to review or re-plan.'
                                    : 'Opens a proposed stop order from Google Directions for all stops on this truck'
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPlanRouteTarget({
                                    driverUid: row.driverUid,
                                    routeCode: row.routeCode,
                                    scheduledDate: row.scheduledDate,
                                  });
                                }}
                              >
                                <Route className="size-4 shrink-0" aria-hidden />
                                {group.anyPlanned ? 'Route planned' : 'Plan route'}
                              </Button>
                            ) : !group.allLoaded &&
                              group.status !== 'cancelled' &&
                              !group.canMarkReady ? (
                              '—'
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </div>
        <VisitsListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          isFetching={query.isFetching && !query.isLoading}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          dataTour="deliveries-pagination"
        />
      </div>
    </div>
  );
}
