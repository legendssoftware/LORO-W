'use client';

import { useEffect, useMemo, useState } from 'react';
import { PackageCheck, PackagePlus, Route } from 'lucide-react';
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
  const hasSearch = search.trim().length > 0;
  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

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
      />

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
          {query.isLoading ? <LoadingSpinner /> : null}
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
                {pageRows.map((row) => (
                  <TableRow
                    key={row.uid}
                    tabIndex={0}
                    className="cursor-pointer"
                    aria-label={`Open ${row.deliveryNumber}`}
                    onClick={() => setSelectedUid(row.uid)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedUid(row.uid);
                      }
                    }}
                  >
                    <TableCell>
                      <span className="font-medium">{row.deliveryNumber}</span>
                      <span className="text-muted-foreground block text-xs">{row.scheduledDate}</span>
                    </TableCell>
                    <TableCell>{row.invoiceNumber || row.orderNumber || '—'}</TableCell>
                    <TableCell>
                      {row.clientName || '—'}
                      {row.clientAddress ? (
                        <span className="text-muted-foreground block text-xs">{row.clientAddress}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.routeCode || '—'}
                      {row.stopSequence != null ? (
                        <span className="text-muted-foreground block text-xs">Stop {row.stopSequence}</span>
                      ) : null}
                      {row.truckRegistration?.trim() ? (
                        <span className="text-muted-foreground block text-xs">{row.truckRegistration.trim()}</span>
                      ) : null}
                      {row.departureFuelLitres != null ? (
                        <span className="text-muted-foreground block text-xs">
                          {row.departureFuelLitres} L filled
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatArrivalWindow(row.estimatedWindowStart, row.estimatedWindowEnd, row.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={deliveryStatusClassName(row.status)}>
                        {formatDeliveryStatus(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.ratingScore == null ? '—' : `${row.ratingScore}/5`}</TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatWeightKg(row.totalWeightKg)}
                    </TableCell>
                    {canDispatch ? (
                      <TableCell>
                        <div className="flex flex-wrap items-start gap-2">
                          {row.routeReady ? (
                            <div className="flex flex-col gap-0.5">
                              <Button
                                type="button"
                                variant="outline"
                                className={cn('h-9', loadedReadyButtonClassName)}
                                disabled
                                aria-label="Loaded — warehouse load already acknowledged"
                                title={
                                  row.routeReadyAt
                                    ? `Loaded at ${formatDeliveryTimestamp(row.routeReadyAt)}`
                                    : 'Warehouse load is marked loaded and ready'
                                }
                              >
                                <PackageCheck className="size-4 shrink-0" aria-hidden />
                                Loaded
                              </Button>
                              {row.routeReadyAt ? (
                                <span className="text-muted-foreground text-[11px] leading-tight">
                                  {formatDeliveryTimestamp(row.routeReadyAt)}
                                </span>
                              ) : null}
                            </div>
                          ) : canMarkDeliveryReady(row) ? (
                            <Button
                              type="button"
                              variant="outline"
                              className={cn('h-9', markLoadedButtonClassName)}
                              aria-label="Mark as Loaded — warehouse load acknowledgment"
                              title="Opens the invoice load checklist, then texts the customer and driver"
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
                          {canPlanRoute(row) ? (
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                'h-9',
                                row.routePlanned
                                  ? routePlannedButtonClassName
                                  : markLoadedButtonClassName,
                              )}
                              aria-label={
                                row.routePlanned
                                  ? 'Route planned — click to review or re-plan'
                                  : 'Plan route — Google-optimized stop order'
                              }
                              title={
                                row.routePlanned
                                  ? 'Route order has been planned and saved. Click to review or re-plan.'
                                  : 'Opens a proposed stop order from Google Directions'
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
                              {row.routePlanned ? 'Route planned' : 'Plan route'}
                            </Button>
                          ) : !row.routeReady && !canMarkDeliveryReady(row) ? (
                            '—'
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
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
