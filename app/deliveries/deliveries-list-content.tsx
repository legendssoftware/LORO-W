'use client';

import { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import {
  filterDeliveriesByInvoice,
  useDeliveries,
  useDeliveryDrivers,
  useSessionSync,
  useTokenReady,
} from '@/api/hooks';
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

const ANY_VALUE = 'all';

export function DeliveriesListContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const canDispatch = canDispatchDeliveries(backendUserData);
  const canViewOrganisation = canViewOrganisationDeliveries(backendUserData);

  const [date, setDate] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(ANY_VALUE);
  const [driverUid, setDriverUid] = useState<string>(ANY_VALUE);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);

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
    () => filterDeliveriesByInvoice(query.data?.deliveries ?? [], invoiceSearch),
    [query.data?.deliveries, invoiceSearch],
  );
  const hasInvoiceSearch = invoiceSearch.trim().length > 0;

  return (
    <div className="flex flex-col p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Deliveries</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Assign a packed order to a driver. The signed proof of delivery appears here once the driver records the
          stop.
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
        search={invoiceSearch}
        onSearchChange={setInvoiceSearch}
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

      {query.isLoading ? <LoadingSpinner /> : null}
      {query.isError ? (
        <p className="text-destructive text-sm">{getQueryErrorMessage(query.error)}</p>
      ) : null}

      {!query.isLoading && !query.isError && rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {hasInvoiceSearch ? 'No deliveries match this invoice number.' : 'No deliveries for this day.'}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
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
                <TableCell>{row.invoiceNumber || '—'}</TableCell>
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
  );
}
