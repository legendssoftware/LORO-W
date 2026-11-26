'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Check, Fuel, Package, PackagePlus, Truck } from 'lucide-react';
import {
  useAssignDeliveriesBatchMutation,
  useAssignableOrders,
  useAssetsInfinite,
  useDeliveryDrivers,
  useTokenReady,
} from '@/api/hooks';
import { DELIVERY_KINDS, MAX_ORDERS_PER_ROUTE, type DeliveryKind } from '@/api/types/epod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import {
  DETAIL_DIALOG_CONTENT_CLASS,
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import { todayDateString } from '@/app/deliveries/format';
import { assetTitle } from '@/app/assets/lib/asset-display';

const EMPTY_VALUE = '';
const ORDER_SPLIT = '\u001f';

const DELIVERY_KIND_LABELS: Record<DeliveryKind, string> = {
  standard: 'Standard',
  ibt: 'IBT',
  bit: 'BIT',
};

/**
 * Human label for a delivery kind. Exhaustive so new kinds fail at compile time.
 * @param kind Delivery kind
 */
function deliveryKindLabel(kind: DeliveryKind): string {
  switch (kind) {
    case 'standard':
      return DELIVERY_KIND_LABELS.standard;
    case 'ibt':
      return DELIVERY_KIND_LABELS.ibt;
    case 'bit':
      return DELIVERY_KIND_LABELS.bit;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

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

/** Assigns one or more open ERP sales orders to a truck, departure fuel, and driver. */
export function AssignDeliveryDialog({ open, onOpenChange }: AssignDeliveryDialogProps) {
  const { isTokenReady } = useTokenReady();
  const ordersQuery = useAssignableOrders(isTokenReady && open);
  const trucksQuery = useAssetsInfinite({
    scope: 'org',
    category: 'VEHICLE',
    enabled: isTokenReady && open,
  });
  const driversQuery = useDeliveryDrivers(isTokenReady && open);
  const assignBatch = useAssignDeliveriesBatchMutation();

  const [selectedOrderKeys, setSelectedOrderKeys] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [typedSalesOrder, setTypedSalesOrder] = useState('');
  const [vehicleAssetUid, setVehicleAssetUid] = useState(EMPTY_VALUE);
  const [departureFuelLitres, setDepartureFuelLitres] = useState('');
  const [driverUid, setDriverUid] = useState(EMPTY_VALUE);
  const [routeCode, setRouteCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(todayDateString());
  const [glCode, setGlCode] = useState('');
  const [deliveryKind, setDeliveryKind] = useState<DeliveryKind>('standard');
  const [bitDisclaimerAccepted, setBitDisclaimerAccepted] = useState(false);
  const [customsToBit, setCustomsToBit] = useState(false);

  const orders = ordersQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  const filteredOrders = useMemo(() => {
    const needle = orderSearch.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => {
      const hay = `${order.orderNumber} ${order.docNumber} ${order.store} ${order.clientName} ${order.status}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [orders, orderSearch]);

  const truckOptions = useMemo<SearchableOptionRow[]>(
    () =>
      trucks.map((truck) => {
        const title = assetTitle(truck);
        const plate = truck.registrationPlate?.trim() ?? '';
        const tonnage =
          truck.tonnageKg != null && Number.isFinite(truck.tonnageKg)
            ? `${truck.tonnageKg} kg`
            : '';
        return {
          value: String(truck.uid),
          label: [title, plate, tonnage].filter(Boolean).join(' · '),
          icon: <Truck className="size-4 shrink-0" />,
          searchExtra: `${title} ${plate} ${tonnage} ${truck.brand ?? ''} ${truck.modelNumber ?? ''} ${truck.fuelType ?? ''} ${truck.vehicleSizeClass ?? ''}`,
        };
      }),
    [trucks],
  );

  const selectedTruck = useMemo(
    () => trucks.find((truck) => String(truck.uid) === vehicleAssetUid) ?? null,
    [trucks, vehicleAssetUid],
  );

  const driverOptions = useMemo<SearchableOptionRow[]>(
    () =>
      (driversQuery.data ?? []).map((driver) => {
        const name = `${driver.name} ${driver.surname}`.trim();
        return {
          value: String(driver.uid),
          label: name,
          icon: <Truck className="size-4 shrink-0" />,
          searchExtra: `${name} ${driver.phone ?? ''} ${driver.workforceType ?? ''} ${driver.role ?? ''}`,
        };
      }),
    [driversQuery.data],
  );

  const fuelLitres = Number(departureFuelLitres);
  const hasFuel = departureFuelLitres.trim().length > 0 && Number.isFinite(fuelLitres) && fuelLitres >= 0;
  const bitOk = deliveryKind !== 'bit' || bitDisclaimerAccepted;
  const isComplete =
    selectedOrderKeys.length > 0 &&
    selectedOrderKeys.length <= MAX_ORDERS_PER_ROUTE &&
    Boolean(vehicleAssetUid) &&
    hasFuel &&
    Boolean(driverUid) &&
    routeCode.trim().length > 0 &&
    Boolean(scheduledDate) &&
    bitOk;

  function toggleOrder(key: string) {
    setSelectedOrderKeys((prev) => {
      if (prev.includes(key)) return prev.filter((value) => value !== key);
      if (prev.length >= MAX_ORDERS_PER_ROUTE) return prev;
      return [...prev, key];
    });
  }

  function addTypedSalesOrder() {
    const typed = typedSalesOrder.trim();
    if (!typed) return;
    const match = orders.find(
      (order) =>
        order.docNumber.toLowerCase() === typed.toLowerCase() ||
        order.orderNumber.toLowerCase() === typed.toLowerCase(),
    );
    if (!match) return;
    const key = orderOptionValue(match.store, match.docNumber);
    setSelectedOrderKeys((prev) => {
      if (prev.includes(key) || prev.length >= MAX_ORDERS_PER_ROUTE) return prev;
      return [...prev, key];
    });
    setTypedSalesOrder('');
    setOrderSearch(typed);
  }

  function reset() {
    setSelectedOrderKeys([]);
    setOrderSearch('');
    setTypedSalesOrder('');
    setVehicleAssetUid(EMPTY_VALUE);
    setDepartureFuelLitres('');
    setDriverUid(EMPTY_VALUE);
    setRouteCode('');
    setScheduledDate(todayDateString());
    setGlCode('');
    setDeliveryKind('standard');
    setBitDisclaimerAccepted(false);
    setCustomsToBit(false);
    assignBatch.reset();
  }

  function onDeliveryKindChange(next: string) {
    const kind = (DELIVERY_KINDS as readonly string[]).includes(next)
      ? (next as DeliveryKind)
      : 'standard';
    setDeliveryKind(kind);
    if (kind !== 'bit') {
      setBitDisclaimerAccepted(false);
      setCustomsToBit(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function onAssign(event: FormEvent) {
    event.preventDefault();
    if (!isComplete || !scheduledDate || assignBatch.isPending) return;
    const orderRefs = selectedOrderKeys
      .map((key) => parseOrderOption(key))
      .filter((row): row is { store: string; docNumber: string } => row != null);
    if (orderRefs.length === 0) return;
    const trimmedGl = glCode.trim();
    void assignBatch
      .mutateAsync({
        orders: orderRefs,
        vehicleAssetUid: Number(vehicleAssetUid),
        departureFuelLitres: fuelLitres,
        driverUid: Number(driverUid),
        routeCode: routeCode.trim(),
        scheduledDate,
        ...(trimmedGl ? { glCode: trimmedGl } : {}),
        deliveryKind,
        ...(deliveryKind === 'bit'
          ? {
              bitDisclaimerAccepted: bitDisclaimerAccepted,
              ...(customsToBit ? { customsToBit: true } : {}),
            }
          : {}),
      })
      .then(() => handleOpenChange(false))
      .catch(() => {
        // Error banner is rendered via assignBatch.isError.
      });
  }

  const isLoadingOptions =
    ordersQuery.isLoading || trucksQuery.isLoading || driversQuery.isLoading;

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
            Select up to {MAX_ORDERS_PER_ROUTE} client orders, the truck from Assets, and fuel filled when it left. Assign the driver last.
          </DialogDescription>
        </DialogHeader>

        {isLoadingOptions ? <LoadingSpinner /> : null}

        {ordersQuery.isError ? (
          <p className="text-destructive text-sm">{getQueryErrorMessage(ordersQuery.error)}</p>
        ) : null}
        {trucksQuery.isError ? (
          <p className="text-destructive text-sm">{getQueryErrorMessage(trucksQuery.error)}</p>
        ) : null}
        {driversQuery.isError ? (
          <p className="text-destructive text-sm">{getQueryErrorMessage(driversQuery.error)}</p>
        ) : null}

        {!isLoadingOptions ? (
          <form onSubmit={onAssign} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Orders</Label>
                <span className="text-muted-foreground text-xs">
                  {selectedOrderKeys.length} / {MAX_ORDERS_PER_ROUTE} selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Filter by order or client…"
                  aria-label="Filter sales orders"
                />
                <div className="flex gap-2">
                  <Input
                    value={typedSalesOrder}
                    onChange={(event) => setTypedSalesOrder(event.target.value)}
                    placeholder="Type sales order number…"
                    aria-label="Type sales order number"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTypedSalesOrder();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTypedSalesOrder}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="border-border max-h-48 overflow-y-auto rounded-md border">
                {filteredOrders.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-sm">No open ERP sales orders match.</p>
                ) : (
                  <ul className="divide-border divide-y">
                    {filteredOrders.map((order) => {
                      const key = orderOptionValue(order.store, order.docNumber);
                      const selected = selectedOrderKeys.includes(key);
                      const atCap = !selected && selectedOrderKeys.length >= MAX_ORDERS_PER_ROUTE;
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            disabled={atCap}
                            onClick={() => toggleOrder(key)}
                            className={cn(
                              'flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors',
                              selected ? 'bg-violet-500/10' : 'hover:bg-muted/60',
                              atCap ? 'opacity-50' : '',
                            )}
                            aria-pressed={selected}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                                selected
                                  ? 'border-violet-600 bg-violet-600 text-white'
                                  : 'border-border',
                              )}
                            >
                              {selected ? <Check className="size-3" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 font-medium">
                                <Package className="size-3.5 shrink-0" />
                                {order.orderNumber}
                              </span>
                              <span className="text-muted-foreground block text-xs">
                                {order.clientName || 'No client'} · {order.itemCount} lines · store{' '}
                                {order.store}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Truck</Label>
                <SearchableOptionListPicker
                  selectedValue={vehicleAssetUid}
                  onValueChange={setVehicleAssetUid}
                  options={truckOptions}
                  includeAllOption={false}
                  allOptionValue={EMPTY_VALUE}
                  placeholderLabelWhenAll="Select a truck"
                  searchPlaceholder="Search trucks by plate or name…"
                  emptyMessage="No fleet vehicles yet. Add a truck under Assets → Vehicle / truck."
                  triggerIcon={<Truck className="size-4 shrink-0" />}
                  triggerClassName="h-9 w-full"
                />
                {selectedTruck?.tonnageKg != null ? (
                  <p className="text-muted-foreground text-xs">
                    Payload capacity: {selectedTruck.tonnageKg} kg
                  </p>
                ) : vehicleAssetUid ? (
                  <p className="text-muted-foreground text-xs">
                    No tonnage set — edit this truck under Assets to add payload (kg).
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assign-fuel">Fuel filled when left (litres)</Label>
                <div className="relative">
                  <Fuel className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    id="assign-fuel"
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    value={departureFuelLitres}
                    onChange={(event) => setDepartureFuelLitres(event.target.value)}
                    placeholder="e.g. 80"
                    aria-label="Fuel filled when the truck left, in litres"
                    className="pl-8"
                  />
                </div>
              </div>

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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assign-gl">GL code (optional)</Label>
                <Input
                  id="assign-gl"
                  value={glCode}
                  onChange={(event) => setGlCode(event.target.value.slice(0, 40))}
                  placeholder="e.g. GL-4400"
                  maxLength={40}
                  aria-label="GL code for China invoices"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-kind">Delivery kind</Label>
                <Select value={deliveryKind} onValueChange={onDeliveryKindChange}>
                  <SelectTrigger id="assign-kind" className="h-9 w-full" aria-label="Delivery kind">
                    <SelectValue placeholder="Select kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {deliveryKindLabel(kind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {deliveryKind === 'bit' ? (
              <div className="border-border space-y-3 rounded-md border px-3 py-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox
                    checked={bitDisclaimerAccepted}
                    onCheckedChange={(value) => setBitDisclaimerAccepted(value === true)}
                    aria-label="BIT disclaimer accepted"
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">BIT disclaimer accepted</span>
                    <span className="text-muted-foreground block text-xs">
                      Required before assigning a BIT delivery.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox
                    checked={customsToBit}
                    onCheckedChange={(value) => setCustomsToBit(value === true)}
                    aria-label="Customs to BIT"
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Customs to BIT</span>
                    <span className="text-muted-foreground block text-xs">Optional.</span>
                  </span>
                </label>
              </div>
            ) : null}

            {assignBatch.isError ? (
              <p className="text-destructive text-sm">{getQueryErrorMessage(assignBatch.error)}</p>
            ) : null}

            <DialogFooter className="flex flex-wrap items-center justify-end gap-4 sm:gap-4">
              <Button type="button" variant="cancel" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={assignButtonClass}
                disabled={!isComplete || assignBatch.isPending}
                aria-label="Assign these deliveries"
              >
                {assignBatch.isPending
                  ? 'Assigning…'
                  : selectedOrderKeys.length > 1
                    ? `Assign ${selectedOrderKeys.length} orders`
                    : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
