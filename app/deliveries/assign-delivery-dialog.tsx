'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Package, PackagePlus, Truck } from 'lucide-react';
import {
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
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import {
  DETAIL_DIALOG_CONTENT_CLASS,
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { todayDateString } from '@/app/deliveries/format';

const EMPTY_VALUE = '';
const ORDER_SPLIT = '\u001f';

/** Picker value for one ERP sales order. Store and document number travel together. */
function orderOptionValue(store: string, docNumber: string): string {
  return `${store}${ORDER_SPLIT}${docNumber}`;
}

/** Splits a picker value back into the ERP store and document number. */
function parseOrderOption(value: string): { store: string; docNumber: string } | null {
  const splitAt = value.indexOf(ORDER_SPLIT);
  if (splitAt <= 0) return null;
  const store = value.slice(0, splitAt);
  const docNumber = value.slice(splitAt + ORDER_SPLIT.length);
  if (!store || !docNumber) return null;
  return { store, docNumber };
}

const assignButtonClass =
  'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 [&_svg]:text-white';

export interface AssignDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Assigns an open ERP sales order to a workforce-type driver. */
export function AssignDeliveryDialog({ open, onOpenChange }: AssignDeliveryDialogProps) {
  const { isTokenReady } = useTokenReady();
  const ordersQuery = useAssignableOrders(isTokenReady && open);
  const driversQuery = useDeliveryDrivers(isTokenReady && open);
  const assign = useAssignDeliveryMutation();

  const [orderKey, setOrderKey] = useState(EMPTY_VALUE);
  const [driverUid, setDriverUid] = useState(EMPTY_VALUE);
  const [routeCode, setRouteCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(todayDateString);

  const orders = ordersQuery.data ?? [];

  const orderOptions = useMemo<SearchableOptionRow[]>(
    () =>
      orders.map((order) => ({
        value: orderOptionValue(order.store, order.docNumber),
        label: `${order.orderNumber} · ${order.clientName || 'No client'} · ${order.itemCount} items`,
        icon: <Package className="size-4 shrink-0" />,
        searchExtra: `${order.docNumber} ${order.store} ${order.clientName} ${order.status}`,
      })),
    [orders],
  );

  const driverOptions = useMemo<SearchableOptionRow[]>(
    () =>
      (driversQuery.data ?? []).map((driver) => {
        const name = `${driver.name} ${driver.surname}`.trim();
        return {
          value: String(driver.uid),
          label: driver.phone ? `${name} · ${driver.phone}` : name,
          icon: <Truck className="size-4 shrink-0" />,
          searchExtra: `${name} ${driver.phone ?? ''} ${driver.workforceType ?? ''} ${driver.role ?? ''}`,
        };
      }),
    [driversQuery.data],
  );

  const selectedOrder = parseOrderOption(orderKey);
  const isComplete =
    selectedOrder != null && Boolean(driverUid) && routeCode.trim().length > 0 && Boolean(scheduledDate);

  function reset() {
    setOrderKey(EMPTY_VALUE);
    setDriverUid(EMPTY_VALUE);
    setRouteCode('');
    setScheduledDate(todayDateString());
    assign.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function onAssign(event: FormEvent) {
    event.preventDefault();
    if (!isComplete || !selectedOrder || !scheduledDate || assign.isPending) return;
    void assign
      .mutateAsync({
        docNumber: selectedOrder.docNumber,
        store: selectedOrder.store,
        driverUid: Number(driverUid),
        routeCode: routeCode.trim(),
        scheduledDate,
      })
      .then(() => handleOpenChange(false));
  }

  const isLoadingOptions = ordersQuery.isLoading || driversQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className={DETAIL_DIALOG_CONTENT_CLASS}>
        <div className="absolute top-4 right-4 z-10">
          <DetailDialogCloseButton />
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5" />
            Assign delivery
          </DialogTitle>
          <DialogDescription>
            Pick an open ERP sales order and a driver whose workforce type is driver.
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
          <form onSubmit={onAssign} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Order</Label>
              <SearchableOptionListPicker
                selectedValue={orderKey}
                onValueChange={setOrderKey}
                options={orderOptions}
                includeAllOption={false}
                allOptionValue={EMPTY_VALUE}
                placeholderLabelWhenAll="Select an order"
                searchPlaceholder="Search order number or client…"
                emptyMessage={
                  ordersQuery.data?.length
                    ? 'No order matches that search.'
                    : 'No open ERP sales orders.'
                }
                triggerIcon={<Package className="size-4 shrink-0" />}
                triggerClassName="h-9 w-full"
              />
              {!ordersQuery.isError && orders.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {ordersQuery.data?.length
                    ? 'No order matches that search.'
                    : 'No open ERP sales orders.'}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Driver</Label>
              <SearchableOptionListPicker
                selectedValue={driverUid}
                onValueChange={setDriverUid}
                options={driverOptions}
                includeAllOption={false}
                allOptionValue={EMPTY_VALUE}
                placeholderLabelWhenAll="Select a driver"
                searchPlaceholder="Search drivers…"
                emptyMessage="No driver profiles yet. Set a staff member's workforce type to driver."
                triggerIcon={<Truck className="size-4 shrink-0" />}
                triggerClassName="h-9 w-full"
              />
              {!driversQuery.isError && driverOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No driver profiles yet. Set a staff member&apos;s workforce type to driver.
                </p>
              ) : null}
            </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assign-route">Route code</Label>
                <Input
                  id="assign-route"
                  value={routeCode}
                  onChange={(event) => setRouteCode(event.target.value)}
                  placeholder="GP-07"
                  aria-label="Route code"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-date">Scheduled day</Label>
                <DatePickerField
                  id="assign-date"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  aria-label="Scheduled day"
                  className="w-full"
                />
              </div>
            </div>

            {assign.isError ? (
              <p className="text-destructive text-sm">{getQueryErrorMessage(assign.error)}</p>
            ) : null}

            <DialogFooter className="flex flex-wrap items-center justify-end gap-4 sm:gap-4">
              <Button type="button" variant="cancel" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={assignButtonClass}
                disabled={!isComplete || assign.isPending}
                aria-label="Assign this delivery"
              >
                {assign.isPending ? 'Assigning…' : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
