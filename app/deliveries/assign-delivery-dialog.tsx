'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Check,
  CornerUpLeft,
  Fuel,
  Lightbulb,
  Package,
  PackagePlus,
  Scale,
  Store,
  Truck,
  Undo2,
  Warehouse,
} from 'lucide-react';
import {
  useAssignDeliveriesBatchMutation,
  useAssignableOrders,
  useAssetsInfinite,
  useDeliveryDrivers,
  useTokenReady,
} from '@/api/hooks';
import {
  DELIVERY_KINDS,
  MAX_ORDERS_PER_ROUTE,
  type AssignableOrder,
  type DeliveryKind,
} from '@/api/types/epod';
import { VEHICLE_DESIGNATION_LABELS, type AssetRecord } from '@/api/types/asset';
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
import {
  formatDeliveryType,
  formatWeightKg,
  todayDateString,
} from '@/app/deliveries/format';
import { assetTitle } from '@/app/assets/lib/asset-display';

const EMPTY_VALUE = '';
const ORDER_SPLIT = '\u001f';
const MIN_OPTIMAL_LOAD_RATIO = 0.6;
const MAX_OPTIMAL_LOAD_RATIO = 0.8;
const TARGET_OPTIMAL_LOAD_RATIO = 0.7;

interface SmallerTruckSuggestion {
  truck: AssetRecord;
  capacityKg: number;
  utilizationPct: number;
}

/** Distance from the ideal 60–80% load utilization band (0 when inside the band). */
function distanceToOptimalBand(ratio: number): number {
  if (ratio >= MIN_OPTIMAL_LOAD_RATIO && ratio <= MAX_OPTIMAL_LOAD_RATIO) return 0;
  return Math.min(Math.abs(ratio - MIN_OPTIMAL_LOAD_RATIO), Math.abs(ratio - MAX_OPTIMAL_LOAD_RATIO));
}

/**
 * Suggests a smaller capable truck when the selected truck is under-utilized (< 60% capacity).
 * Prefers a truck whose load utilization sits inside 60–80% (closest to 70%), falling back to
 * the closest smaller fit that still improves utilization over the currently selected truck.
 */
function findSuggestedSmallerTruck(
  totalWeightKg: number,
  selectedTruck: AssetRecord | null,
  capableTrucks: readonly AssetRecord[],
): SmallerTruckSuggestion | null {
  if (totalWeightKg <= 0 || !selectedTruck) return null;
  const selectedCapacityKg = selectedTruck.tonnageKg;
  if (
    selectedCapacityKg == null ||
    !Number.isFinite(selectedCapacityKg) ||
    selectedCapacityKg <= 0 ||
    totalWeightKg > selectedCapacityKg
  ) {
    return null;
  }

  const currentRatio = totalWeightKg / selectedCapacityKg;
  if (currentRatio >= MIN_OPTIMAL_LOAD_RATIO) return null;
  const currentDistance = distanceToOptimalBand(currentRatio);

  let best: {
    truck: AssetRecord;
    capacityKg: number;
    ratio: number;
    bandDistance: number;
    targetDistance: number;
  } | null = null;

  for (const truck of capableTrucks) {
    if (truck.uid === selectedTruck.uid) continue;
    const capacityKg = truck.tonnageKg;
    if (
      capacityKg == null ||
      !Number.isFinite(capacityKg) ||
      capacityKg < totalWeightKg ||
      capacityKg >= selectedCapacityKg
    ) {
      continue;
    }

    const ratio = totalWeightKg / capacityKg;
    const bandDistance = distanceToOptimalBand(ratio);
    if (bandDistance >= currentDistance) continue;

    const targetDistance = Math.abs(ratio - TARGET_OPTIMAL_LOAD_RATIO);
    if (
      best == null ||
      bandDistance < best.bandDistance ||
      (bandDistance === best.bandDistance && targetDistance < best.targetDistance) ||
      (bandDistance === best.bandDistance &&
        targetDistance === best.targetDistance &&
        capacityKg < best.capacityKg)
    ) {
      best = { truck, capacityKg, ratio, bandDistance, targetDistance };
    }
  }

  if (!best) return null;
  return {
    truck: best.truck,
    capacityKg: best.capacityKg,
    utilizationPct: Math.round(best.ratio * 100),
  };
}

/** Icon for each delivery type. Exhaustive so new types fail at compile time. */
function deliveryTypeIcon(kind: DeliveryKind): ReactNode {
  switch (kind) {
    case 'branch_to_branch':
      return <ArrowLeftRight className="size-4 shrink-0 text-sky-500" aria-hidden />;
    case 'branch_to_customer':
      return <Store className="size-4 shrink-0 text-violet-500" aria-hidden />;
    case 'hq_to_customer':
      return <Warehouse className="size-4 shrink-0 text-emerald-500" aria-hidden />;
    case 'branch_to_hq':
      return <Building2 className="size-4 shrink-0 text-amber-500" aria-hidden />;
    case 'customer_to_branch':
      return <Undo2 className="size-4 shrink-0 text-rose-500" aria-hidden />;
    case 'customer_to_hq':
      return <CornerUpLeft className="size-4 shrink-0 text-orange-500" aria-hidden />;
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
  const [glManuallyEdited, setGlManuallyEdited] = useState(false);
  const [deliveryKind, setDeliveryKind] = useState<DeliveryKind>('branch_to_customer');

  const orders = ordersQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  const orderByKey = useMemo(() => {
    const map = new Map<string, AssignableOrder>();
    for (const order of orders) {
      map.set(orderOptionValue(order.store, order.docNumber), order);
    }
    return map;
  }, [orders]);

  const selectedOrders = useMemo(
    () =>
      selectedOrderKeys
        .map((key) => orderByKey.get(key))
        .filter((order): order is AssignableOrder => order != null),
    [selectedOrderKeys, orderByKey],
  );

  /** Sum of weights (kg) across all currently selected orders. */
  const selectedTotalWeightKg = useMemo(() => {
    const sum = selectedOrders.reduce((acc, order) => {
      const w = order.weightKg;
      return w != null && Number.isFinite(w) && w > 0 ? acc + w : acc;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [selectedOrders]);

  /** Auto-populate GL code from the selected order(s) unless manually edited. */
  const derivedOrderGlCode = useMemo(() => {
    for (const order of selectedOrders) {
      const code = order.glCode?.trim();
      if (code) return code.slice(0, 40);
    }
    return '';
  }, [selectedOrders]);

  useEffect(() => {
    if (!glManuallyEdited) {
      setGlCode(derivedOrderGlCode);
    }
  }, [derivedOrderGlCode, glManuallyEdited]);

  const filteredOrders = useMemo(() => {
    const needle = orderSearch.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) => {
      const hay = `${order.orderNumber} ${order.docNumber} ${order.store} ${order.clientName} ${order.glCode ?? ''} ${order.status}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [orders, orderSearch]);

  /** Only trucks with enough rated tonnage for the currently selected load remain selectable. */
  const capableTrucks = useMemo(() => {
    if (selectedTotalWeightKg <= 0) return trucks;
    return trucks.filter(
      (truck) =>
        truck.tonnageKg != null &&
        Number.isFinite(truck.tonnageKg) &&
        truck.tonnageKg >= selectedTotalWeightKg,
    );
  }, [trucks, selectedTotalWeightKg]);

  const truckOptions = useMemo<SearchableOptionRow[]>(
    () =>
      capableTrucks.map((truck) => {
        const title = assetTitle(truck);
        const plate = truck.registrationPlate?.trim() ?? '';
        const tonnage =
          truck.tonnageKg != null && Number.isFinite(truck.tonnageKg)
            ? `${truck.tonnageKg.toLocaleString('en-ZA')} kg`
            : 'No tonnage';
        const designation = truck.vehicleDesignation
          ? VEHICLE_DESIGNATION_LABELS[truck.vehicleDesignation]
          : '';
        return {
          value: String(truck.uid),
          label: [title, plate, tonnage, designation].filter(Boolean).join(' · '),
          icon: <Truck className="size-4 shrink-0" />,
          searchExtra: `${title} ${plate} ${tonnage} ${designation} ${truck.brand ?? ''} ${truck.modelNumber ?? ''} ${truck.fuelType ?? ''} ${truck.vehicleSizeClass ?? ''}`,
        };
      }),
    [capableTrucks],
  );

  const selectedTruck = useMemo(
    () => trucks.find((truck) => String(truck.uid) === vehicleAssetUid) ?? null,
    [trucks, vehicleAssetUid],
  );

  const selectedTruckCapacityKg =
    selectedTruck?.tonnageKg != null && Number.isFinite(selectedTruck.tonnageKg)
      ? selectedTruck.tonnageKg
      : null;

  const isTruckOverloaded =
    selectedTruck != null &&
    selectedTotalWeightKg > 0 &&
    (selectedTruckCapacityKg == null || selectedTotalWeightKg > selectedTruckCapacityKg);

  const overloadByKg =
    selectedTruckCapacityKg != null && selectedTotalWeightKg > selectedTruckCapacityKg
      ? Math.round((selectedTotalWeightKg - selectedTruckCapacityKg) * 100) / 100
      : null;

  const remainingCapacityKg =
    selectedTruckCapacityKg != null && selectedTotalWeightKg <= selectedTruckCapacityKg
      ? Math.round((selectedTruckCapacityKg - selectedTotalWeightKg) * 100) / 100
      : null;

  const loadUtilizationPct =
    selectedTruckCapacityKg != null && selectedTruckCapacityKg > 0
      ? Math.min(999, Math.round((selectedTotalWeightKg / selectedTruckCapacityKg) * 100))
      : null;

  const suggestedSmallerTruck = useMemo(
    () => findSuggestedSmallerTruck(selectedTotalWeightKg, selectedTruck, capableTrucks),
    [selectedTotalWeightKg, selectedTruck, capableTrucks],
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
  const hasFuel =
    departureFuelLitres.trim().length > 0 && Number.isFinite(fuelLitres) && fuelLitres >= 0;
  const isComplete =
    selectedOrderKeys.length > 0 &&
    selectedOrderKeys.length <= MAX_ORDERS_PER_ROUTE &&
    Boolean(vehicleAssetUid) &&
    !isTruckOverloaded &&
    hasFuel &&
    Boolean(driverUid) &&
    routeCode.trim().length > 0 &&
    Boolean(scheduledDate);

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
    setGlManuallyEdited(false);
    setDeliveryKind('branch_to_customer');
    assignBatch.reset();
  }

  function onDeliveryKindChange(next: string) {
    const kind = (DELIVERY_KINDS as readonly string[]).includes(next)
      ? (next as DeliveryKind)
      : 'branch_to_customer';
    setDeliveryKind(kind);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function onAssign(event: FormEvent) {
    event.preventDefault();
    if (!isComplete || !scheduledDate || assignBatch.isPending) return;
    const trimmedGl = glCode.trim();
    const orderRefs = selectedOrderKeys
      .map((key) => {
        const parsed = parseOrderOption(key);
        if (!parsed) return null;
        const orderMeta = orderByKey.get(key);
        const orderGl = !glManuallyEdited ? orderMeta?.glCode?.trim() || undefined : undefined;
        return {
          ...parsed,
          ...(orderGl ? { glCode: orderGl.slice(0, 40) } : {}),
        };
      })
      .filter((row): row is { store: string; docNumber: string; glCode?: string } => row != null);
    if (orderRefs.length === 0) return;
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
            Select up to {MAX_ORDERS_PER_ROUTE} client orders, match a truck with enough tonnage, and record departure fuel and driver.
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
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Scale className="size-3.5 text-violet-500" aria-hidden />
                    Load:{' '}
                    {selectedTotalWeightKg > 0
                      ? `${selectedTotalWeightKg.toLocaleString('en-ZA')} kg (${(selectedTotalWeightKg / 1000).toFixed(2)} t)`
                      : '0 kg'}
                  </span>
                  <span className="text-muted-foreground">
                    {selectedOrderKeys.length} / {MAX_ORDERS_PER_ROUTE} selected
                  </span>
                </div>
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
                      const weightLabel =
                        order.weightKg != null && order.weightKg > 0
                          ? formatWeightKg(order.weightKg)
                          : 'Weight n/a';
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
                              <span className="flex flex-wrap items-center justify-between gap-2 font-medium">
                                <span className="flex items-center gap-2">
                                  <Package className="size-3.5 shrink-0" />
                                  {order.orderNumber}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {weightLabel}
                                </span>
                              </span>
                              <span className="text-muted-foreground block text-xs">
                                {order.clientName || 'No client'} · {order.itemCount} lines · store{' '}
                                {order.store}
                                {order.glCode?.trim() ? ` · GL ${order.glCode.trim()}` : ''}
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

            {isTruckOverloaded ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-900 dark:text-red-200">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-red-500" aria-hidden />
                  {overloadByKg != null
                    ? `Truck overloaded by ${overloadByKg.toLocaleString('en-ZA')} kg (load ${selectedTotalWeightKg.toLocaleString('en-ZA')} kg > capacity ${selectedTruckCapacityKg?.toLocaleString('en-ZA')} kg). Switch to a higher-tonnage truck.`
                    : 'Selected truck has no rated tonnage set for this load. Switch to a rated truck or set tonnage under Assets.'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setVehicleAssetUid(EMPTY_VALUE)}
                >
                  Switch truck
                </Button>
              </div>
            ) : selectedTotalWeightKg > 0 && capableTrucks.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden />
                No fleet truck has rated tonnage of at least{' '}
                {selectedTotalWeightKg.toLocaleString('en-ZA')} kg. Split the selected orders across
                multiple loads or update truck tonnage under Assets.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Truck</Label>
                  {selectedTotalWeightKg > 0 ? (
                    <span className="text-muted-foreground text-xs">
                      {capableTrucks.length} of {trucks.length} trucks fit
                    </span>
                  ) : null}
                </div>
                <SearchableOptionListPicker
                  selectedValue={vehicleAssetUid}
                  onValueChange={setVehicleAssetUid}
                  options={truckOptions}
                  includeAllOption={false}
                  allOptionValue={EMPTY_VALUE}
                  placeholderLabelWhenAll="Select a truck"
                  searchPlaceholder="Search trucks by plate, tonnage, or designation…"
                  emptyMessage={
                    selectedTotalWeightKg > 0
                      ? `No truck can carry ${selectedTotalWeightKg.toLocaleString('en-ZA')} kg.`
                      : 'No fleet vehicles yet. Add a truck under Assets → Vehicle / truck.'
                  }
                  triggerIcon={<Truck className="size-4 shrink-0" />}
                  triggerClassName="h-9 w-full sm:w-full max-w-full overflow-hidden"
                />
                {selectedTruck && selectedTruckCapacityKg != null && !isTruckOverloaded ? (
                  <div className="border-border bg-muted/30 space-y-1.5 rounded-md border px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Loaded:{' '}
                        <span className="font-medium text-foreground">
                          {selectedTotalWeightKg.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} kg
                        </span>{' '}
                        / {selectedTruckCapacityKg.toLocaleString('en-ZA')} kg
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          loadUtilizationPct != null && loadUtilizationPct >= 85
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-emerald-600 dark:text-emerald-300',
                        )}
                      >
                        {remainingCapacityKg != null
                          ? `${remainingCapacityKg.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} kg left (${loadUtilizationPct ?? 0}%)`
                          : `${loadUtilizationPct ?? 0}% used`}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          loadUtilizationPct != null && loadUtilizationPct >= 85
                            ? 'bg-amber-500'
                            : 'bg-emerald-500',
                        )}
                        style={{ width: `${Math.min(100, loadUtilizationPct ?? 0)}%` }}
                      />
                    </div>
                  </div>
                ) : selectedTruck && selectedTruckCapacityKg == null ? (
                  <p className="text-muted-foreground text-xs">
                    No tonnage set — edit this truck under Assets to add payload (kg).
                  </p>
                ) : null}
                {suggestedSmallerTruck ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
                      <span>
                        This load uses{' '}
                        <span className="font-medium">{loadUtilizationPct ?? 0}%</span> of the
                        selected truck (ideal 60–80%). Consider a smaller truck:{' '}
                        <span className="font-medium">
                          {[
                            assetTitle(suggestedSmallerTruck.truck),
                            suggestedSmallerTruck.truck.registrationPlate?.trim(),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>{' '}
                        ({suggestedSmallerTruck.capacityKg.toLocaleString('en-ZA')} kg ·{' '}
                        {suggestedSmallerTruck.utilizationPct}% load).
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 border-sky-500/40 bg-sky-500/15 text-sky-900 hover:bg-sky-500/25 dark:text-sky-100"
                      onClick={() => setVehicleAssetUid(String(suggestedSmallerTruck.truck.uid))}
                    >
                      Switch truck
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 space-y-1.5">
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

              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="assign-route">Route code</Label>
                <Input
                  id="assign-route"
                  value={routeCode}
                  onChange={(event) => setRouteCode(event.target.value)}
                  placeholder="GP-07"
                  aria-label="Route code"
                />
              </div>

              <div className="min-w-0 space-y-1.5 sm:col-span-2">
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
                triggerClassName="h-9 w-full sm:w-full"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assign-gl">GL code (optional)</Label>
                <Input
                  id="assign-gl"
                  value={glCode}
                  onChange={(event) => {
                    setGlManuallyEdited(true);
                    setGlCode(event.target.value.slice(0, 40));
                  }}
                  placeholder="Auto-populated from order or enter GL"
                  maxLength={40}
                  aria-label="GL code"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-kind">Delivery type</Label>
                <Select value={deliveryKind} onValueChange={onDeliveryKindChange}>
                  <SelectTrigger id="assign-kind" className="h-9 w-full" aria-label="Delivery type">
                    <SelectValue placeholder="Select delivery type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        <span className="inline-flex items-center gap-2">
                          {deliveryTypeIcon(kind)}
                          {formatDeliveryType(kind)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
