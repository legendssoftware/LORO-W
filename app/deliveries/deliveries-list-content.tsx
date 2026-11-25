'use client';

import { useEffect, useMemo, useState } from 'react';
import { PackageCheck, PackagePlus } from 'lucide-react';
import {
  filterDeliveries,
  useDeliveries,
  useDeliveryDrivers,
  useMarkRouteReadyMutation,
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
  deliveryStatusClassName,
  formatArrivalWindow,
  formatDeliveryStatus,
  loadedReadyButtonClassName,
  markLoadedButtonClassName,
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

/** True when this row is the exact route the mark-ready mutation targeted. */
function isMarkReadyTarget(
  row: DeliverySummary,
  target: { driverUid: number; routeCode: string; scheduledDate: string } | undefined,
): boolean {
  if (!target) return false;
  return (
    target.driverUid === row.driverUid &&
    target.routeCode === row.routeCode &&
    target.scheduledDate === row.scheduledDate
  );
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
  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() => readStoredPageSize(DELIVERIES_PAGE_SIZE_KEY));
  const markReady = useMarkRouteReadyMutation();

  const query = useDeliveries(
    {
      ...(date ? { date } : {}),
      ...(status !== ANY_VALUE ? { status: status as DeliveryStatus } : {}),
      ...(canViewOrganisation && driverUid !== ANY_VALUE ? { driverUid: Number(driverUid) } : {}),
    },
    isTokenReady,
  );
  const driversQuery = useDeliveryDrivers(isTokenReady && canViewOrganisation);

  const rows = useMemo(
    () => filterDeliveries(query.data?.deliveries ?? [], search),
    [query.data?.deliveries, search],
  );
  const hasSearch = search.trim().length > 0;
  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [date, status, driverUid, pageSize, search]);

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
                  <TableHead>{t('tables.items')}</TableHead>
                  {canDispatch ? <TableHead>Loaded</TableHead> : null}
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
                    <TableCell className="text-muted-foreground text-sm">{row.itemSummary || '—'}</TableCell>
                    {canDispatch ? (
                      <TableCell>
                        {row.routeReady ? (
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('h-9', loadedReadyButtonClassName)}
                            disabled
                            aria-label="Loaded — warehouse load already acknowledged"
                            title="Warehouse load is marked loaded and ready"
                          >
                            <PackageCheck className="size-4 shrink-0" aria-hidden />
                            Loaded
                          </Button>
                        ) : canMarkDeliveryReady(row) ? (
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('h-9', markLoadedButtonClassName)}
                            disabled={markReady.isPending && isMarkReadyTarget(row, markReady.variables)}
                            aria-label="Mark loaded — warehouse load acknowledgment"
                            title="Marks the warehouse load as loaded and ready, then texts the customer and driver"
                            onClick={(event) => {
                              event.stopPropagation();
                              void markReady.mutate({
                                driverUid: row.driverUid,
                                routeCode: row.routeCode,
                                scheduledDate: row.scheduledDate,
                              });
                            }}
                          >
                            <PackageCheck className="size-4 shrink-0" aria-hidden />
                            Mark loaded
                          </Button>
                        ) : (
                          '—'
                        )}
                        {markReady.isError && isMarkReadyTarget(row, markReady.variables) ? (
                          <p className="text-destructive mt-1 text-xs">{getQueryErrorMessage(markReady.error)}</p>
                        ) : null}
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
