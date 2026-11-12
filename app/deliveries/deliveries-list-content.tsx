'use client';

import { useEffect, useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useDeliveries, useDeliveryDrivers, useSessionSync, useTokenReady } from '@/api/hooks';
import type { DeliveryStatus } from '@/api/types/epod';
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
import { cn } from '@/lib/utils';
import { AssignDeliveryDialog } from '@/app/deliveries/assign-delivery-dialog';
import { DeliveryDetailDialog } from '@/app/deliveries/delivery-detail-dialog';
import { DeliveriesFiltersBar } from '@/app/deliveries/deliveries-filters-bar';
import { deliveryStatusClassName, formatDeliveryStatus } from '@/app/deliveries/format';
import {
  VisitsListPagination,
  readStoredPageSize,
  type VisitsPageSize,
} from '@/app/visits/components/visits-list-pagination';

const ANY_VALUE = 'all';
const DELIVERIES_PAGE_SIZE_KEY = 'loro:deliveries-page-size';

export function DeliveriesListContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const canDispatch = canDispatchDeliveries(backendUserData);
  const canViewOrganisation = canViewOrganisationDeliveries(backendUserData);

  const [date, setDate] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(ANY_VALUE);
  const [driverUid, setDriverUid] = useState<string>(ANY_VALUE);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
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

  const rows = query.data?.deliveries ?? [];
  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [date, status, driverUid, pageSize]);

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
    <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
      <div className="mb-6 shrink-0">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Deliveries</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Assign an open ERP sales order to a driver. The signed proof of delivery appears here once the driver records
          the stop.
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
            >
              <PackagePlus className="size-4" />
              Assign delivery
            </Button>
          ) : null
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.isLoading ? <LoadingSpinner /> : null}
          {query.isError ? (
            <p className="text-destructive p-4 text-sm">{getQueryErrorMessage(query.error)}</p>
          ) : null}

          {!query.isLoading && !query.isError && rows.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">No deliveries match these filters.</p>
          ) : null}

          {pageRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
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
                    <TableCell>
                      {row.clientName || '—'}
                      {row.clientAddress ? (
                        <span className="text-muted-foreground block text-xs">{row.clientAddress}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.routeCode || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={deliveryStatusClassName(row.status)}>
                        {formatDeliveryStatus(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.itemSummary || '—'}</TableCell>
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
