'use client';

import { useMemo, useState } from 'react';
import {
  filterAssignableOrders,
  useAssignDeliveryMutation,
  useAssignableOrders,
  useDeliveryDrivers,
  useTokenReady,
} from '@/api/hooks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/loading-spinner';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { todayDateString } from '@/app/deliveries/format';

export interface AssignDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Assigns a packed shop order to a driver without leaving the list. */
export function AssignDeliveryDialog({ open, onOpenChange }: AssignDeliveryDialogProps) {
  const { isTokenReady } = useTokenReady();
  const ordersQuery = useAssignableOrders(isTokenReady && open);
  const driversQuery = useDeliveryDrivers(isTokenReady && open);
  const assign = useAssignDeliveryMutation();

  const [search, setSearch] = useState('');
  const [orderUid, setOrderUid] = useState('');
  const [driverUid, setDriverUid] = useState('');
  const [routeCode, setRouteCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(todayDateString);

  const orders = useMemo(
    () => filterAssignableOrders(ordersQuery.data ?? [], search),
    [ordersQuery.data, search],
  );

  const isComplete =
    Boolean(orderUid) && Boolean(driverUid) && routeCode.trim().length > 0 && Boolean(scheduledDate);

  function reset() {
    setSearch('');
    setOrderUid('');
    setDriverUid('');
    setRouteCode('');
    setScheduledDate(todayDateString());
    assign.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function onAssign() {
    if (!isComplete || !scheduledDate) return;
    await assign.mutateAsync({
      orderUid: Number(orderUid),
      driverUid: Number(driverUid),
      routeCode: routeCode.trim(),
      scheduledDate,
    });
    handleOpenChange(false);
  }

  const isLoadingOptions = ordersQuery.isLoading || driversQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign delivery</DialogTitle>
          <DialogDescription>
            Pick a packed order and the driver who will deliver it. The order moves to out for delivery.
          </DialogDescription>
        </DialogHeader>

        {isLoadingOptions ? <LoadingSpinner /> : null}

        {ordersQuery.isError ? (
          <p className="text-destructive text-sm">{getQueryErrorMessage(ordersQuery.error)}</p>
        ) : null}
        {driversQuery.isError ? (
          <p className="text-destructive text-sm">{getQueryErrorMessage(driversQuery.error)}</p>
        ) : null}

        {!isLoadingOptions ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-search">Find an order</Label>
              <Input
                id="assign-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order number or client"
                aria-label="Search assignable orders"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-order">Order</Label>
              <select
                id="assign-order"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={orderUid}
                onChange={(event) => setOrderUid(event.target.value)}
              >
                <option value="">Select an order</option>
                {orders.map((order) => (
                  <option key={order.uid} value={order.uid}>
                    {`${order.orderNumber} · ${order.clientName || 'No client'} · ${order.itemCount} items`}
                  </option>
                ))}
              </select>
              {!ordersQuery.isError && orders.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {ordersQuery.data?.length
                    ? 'No order matches that search.'
                    : 'No orders are waiting to be assigned.'}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-driver">Driver</Label>
              <select
                id="assign-driver"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={driverUid}
                onChange={(event) => setDriverUid(event.target.value)}
              >
                <option value="">Select a driver</option>
                {(driversQuery.data ?? []).map((driver) => (
                  <option key={driver.uid} value={driver.uid}>
                    {`${driver.name} ${driver.surname}`.trim()}
                    {driver.phone ? ` · ${driver.phone}` : ''}
                  </option>
                ))}
              </select>
              {!driversQuery.isError && (driversQuery.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No driver profiles yet. Set a staff member&apos;s workforce type or role to driver.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-route">Route code</Label>
              <Input
                id="assign-route"
                value={routeCode}
                onChange={(event) => setRouteCode(event.target.value)}
                placeholder="GP-07"
                aria-label="Route code"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-date">Scheduled day</Label>
              <DatePickerField
                id="assign-date"
                value={scheduledDate}
                onChange={setScheduledDate}
                aria-label="Scheduled day"
              />
            </div>

            {assign.isError ? (
              <p className="text-destructive text-sm">{getQueryErrorMessage(assign.error)}</p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isComplete || assign.isPending}
            onClick={() => void onAssign()}
            aria-label="Assign this delivery"
          >
            {assign.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
