'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRightLeft, Fuel, Lightbulb, Truck } from 'lucide-react';
import {
  useAssetsInfinite,
  useDeliveries,
  useDeliveryDrivers,
  useReassignDeliveryMutation,
  useTokenReady,
} from '@/api/hooks';
import type { DeliverySummary } from '@/api/types/epod';
import { VEHICLE_DESIGNATION_LABELS } from '@/api/types/asset';
import {
  DETAIL_DIALOG_CONTENT_CLASS,
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  SearchableOptionListPicker,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import { DatePickerField } from '@/components/ui/date-picker-field';
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
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import { assetTitle } from '@/app/assets/lib/asset-display';
import { formatWeightKg, todayDateString } from '@/app/deliveries/format';
import {
  findSuggestedTruck,
  formatSuggestedTruckLabel,
  remainingTruckCapacityKg,
  summarizeTruckLoads,
} from '@/app/deliveries/truck-capacity';

const EMPTY_VALUE = '';

export interface ReassignInvoiceDialogProps {
  delivery: DeliverySummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned?: () => void;
}

/** Moves one open invoice/stop to another truck, driver, route code, or day without affecting sibling invoices. */
export function ReassignInvoiceDialog({
  delivery,
  open,
  onOpenChange,
  onReassigned,
}: ReassignInvoiceDialogProps) {
  const { isTokenReady } = useTokenReady();
  const trucksQuery = useAssetsInfinite({
    scope: 'org',
    category: 'VEHICLE',
    enabled: isTokenReady && open,
  });
  const driversQuery = useDeliveryDrivers(isTokenReady && open);
  const reassign = useReassignDeliveryMutation();

  const [vehicleAssetUid, setVehicleAssetUid] = useState(EMPTY_VALUE);
  const [driverUid, setDriverUid] = useState(EMPTY_VALUE);
  const [routeCode, setRouteCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(todayDateString());
  const [departureFuelLitres, setDepartureFuelLitres] = useState('');

  const dayDeliveriesQuery = useDeliveries(
    scheduledDate ? { date: scheduledDate } : {},
    isTokenReady && open && Boolean(scheduledDate),
  );

  useEffect(() => {
    if (open && delivery) {
      setVehicleAssetUid(delivery.vehicleAssetUid != null ? String(delivery.vehicleAssetUid) : EMPTY_VALUE);
      setDriverUid(delivery.driverUid > 0 ? String(delivery.driverUid) : EMPTY_VALUE);
      setRouteCode(delivery.routeCode ?? '');
      setScheduledDate(delivery.scheduledDate || todayDateString());
      setDepartureFuelLitres(
        delivery.departureFuelLitres != null ? String(delivery.departureFuelLitres) : '',
      );
      reassign.reset();
    }
  }, [open, delivery?.uid]);

  const trucks = trucksQuery.data ?? [];
  const truckLoads = useMemo(
    () => summarizeTruckLoads(dayDeliveriesQuery.data?.deliveries ?? [], delivery?.uid),
    [dayDeliveriesQuery.data?.deliveries, delivery?.uid],
  );
  const invoiceWeightKg =
    delivery?.totalWeightKg != null &&
    Number.isFinite(delivery.totalWeightKg) &&
    delivery.totalWeightKg > 0
      ? delivery.totalWeightKg
      : 0;

  const capableTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      const freeKg = remainingTruckCapacityKg(truck, truckLoads);
      if (freeKg == null) return invoiceWeightKg <= 0;
      if (freeKg <= 0) return false;
      return invoiceWeightKg <= 0 || freeKg >= invoiceWeightKg;
    });
  }, [trucks, truckLoads, invoiceWeightKg]);

  const truckOptions = useMemo<SearchableOptionRow[]>(() => {
    const scored = trucks.map((truck) => {
      const title = assetTitle(truck);
      const plate = truck.registrationPlate?.trim() ?? '';
      const capacityKg =
        truck.tonnageKg != null && Number.isFinite(truck.tonnageKg) && truck.tonnageKg > 0
          ? truck.tonnageKg
          : null;
      const tonnage = capacityKg != null ? `${capacityKg.toLocaleString('en-ZA')} kg` : 'No tonnage';
      const designation = truck.vehicleDesignation
        ? VEHICLE_DESIGNATION_LABELS[truck.vehicleDesignation]
        : '';
      const active = truckLoads.get(truck.uid);
      const existingStopCount = active?.stopCount ?? 0;
      const freeKg = remainingTruckCapacityKg(truck, truckLoads);
      const isFull = capacityKg != null && freeKg != null && freeKg <= 0;
      const lacksSpace =
        !isFull && invoiceWeightKg > 0 && (freeKg == null || freeKg < invoiceWeightKg);
      const hasExistingLoad = existingStopCount > 0;
      const disabled = isFull || lacksSpace;

      let badge: string | undefined;
      let badgeClassName: string | undefined;
      let itemClassName: string | undefined;

      if (isFull) {
        badge = `Full · ${existingStopCount} ${existingStopCount === 1 ? 'order' : 'orders'}`;
        badgeClassName =
          'border border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300';
        itemClassName = 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
      } else if (hasExistingLoad && !lacksSpace && freeKg != null) {
        badge = `${existingStopCount} assigned · ${freeKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg free`;
        badgeClassName =
          'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
        itemClassName = 'bg-emerald-500/10';
      } else if (lacksSpace) {
        badge =
          freeKg != null
            ? `Only ${freeKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg free`
            : 'No tonnage';
        badgeClassName = 'bg-muted text-muted-foreground';
      }

      const sortRank = isFull ? 2 : lacksSpace ? 1 : 0;
      return {
        sortRank,
        row: {
          value: String(truck.uid),
          label: [title, plate, tonnage, designation].filter(Boolean).join(' · '),
          icon: (
            <Truck
              className={cn(
                'size-4 shrink-0',
                hasExistingLoad && !isFull && 'text-emerald-600 dark:text-emerald-400',
              )}
            />
          ),
          searchExtra: `${title} ${plate} ${tonnage} ${designation} ${truck.brand ?? ''} ${truck.modelNumber ?? ''}`,
          disabled,
          badge,
          badgeClassName,
          itemClassName,
        } satisfies SearchableOptionRow,
      };
    });
    scored.sort((a, b) => a.sortRank - b.sortRank);
    return scored.map((entry) => entry.row);
  }, [trucks, truckLoads, invoiceWeightKg]);

  const selectedTruck = useMemo(
    () => trucks.find((truck) => String(truck.uid) === vehicleAssetUid) ?? null,
    [trucks, vehicleAssetUid],
  );

  const selectedTruckCapacityKg =
    selectedTruck?.tonnageKg != null && Number.isFinite(selectedTruck.tonnageKg)
      ? selectedTruck.tonnageKg
      : null;

  const selectedTruckExistingKg = selectedTruck ? (truckLoads.get(selectedTruck.uid)?.loadKg ?? 0) : 0;
  const projectedWeightKg = Math.round((selectedTruckExistingKg + invoiceWeightKg) * 100) / 100;

  const isTruckOverloaded =
    selectedTruck != null &&
    (invoiceWeightKg > 0 || selectedTruckExistingKg > 0) &&
    (selectedTruckCapacityKg == null || projectedWeightKg > selectedTruckCapacityKg);

  const loadUtilizationPct =
    selectedTruckCapacityKg != null && selectedTruckCapacityKg > 0 && projectedWeightKg > 0
      ? Math.min(999, Math.round((projectedWeightKg / selectedTruckCapacityKg) * 100))
      : null;

  const suggestedTruck = useMemo(
    () => findSuggestedTruck(invoiceWeightKg, selectedTruck, capableTrucks, truckLoads),
    [invoiceWeightKg, selectedTruck, capableTrucks, truckLoads],
  );

  const driverOptions = useMemo<SearchableOptionRow[]>(
    () =>
      (driversQuery.data ?? []).map((driver) => {
        const name = `${driver.name} ${driver.surname}`.trim();
        return {
          value: String(driver.uid),
          label: name,
          icon: <Truck className="size-4 shrink-0" />,
          searchExtra: `${name} ${driver.phone ?? ''}`,
        };
      }),
    [driversQuery.data],
  );

  const fuelTrimmed = departureFuelLitres.trim();
  const parsedFuel = fuelTrimmed.length > 0 ? Number(fuelTrimmed) : undefined;
  const fuelValid = parsedFuel === undefined || (Number.isFinite(parsedFuel) && parsedFuel >= 0);

  const isComplete =
    delivery != null &&
    Boolean(vehicleAssetUid) &&
    !isTruckOverloaded &&
    Boolean(driverUid) &&
    routeCode.trim().length > 0 &&
    Boolean(scheduledDate) &&
    fuelValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!delivery || !isComplete || !scheduledDate) return;
    await reassign.mutateAsync({
      uid: delivery.uid,
      body: {
        vehicleAssetUid: Number(vehicleAssetUid),
        driverUid: Number(driverUid),
        routeCode: routeCode.trim(),
        scheduledDate,
        ...(parsedFuel !== undefined ? { departureFuelLitres: parsedFuel } : {}),
      },
    });
    onOpenChange(false);
    onReassigned?.();
  }

  const invoiceTitle =
    delivery?.invoiceNumber || delivery?.orderNumber || delivery?.deliveryNumber || 'invoice';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={DETAIL_DIALOG_CONTENT_CLASS}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-violet-500" aria-hidden />
            Reassign {invoiceTitle}
          </DialogTitle>
          <DialogDescription>
            Move only this invoice to another truck, driver, route, or day. Other invoices on the
            current route remain unchanged.
            {invoiceWeightKg > 0 ? ` Invoice weight: ${formatWeightKg(invoiceWeightKg)}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 py-1">
          {isTruckOverloaded ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-900 dark:text-red-200">
              <span className="flex min-w-0 flex-1 items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
                <span>
                  Selected truck cannot carry {formatWeightKg(invoiceWeightKg)}.{' '}
                  {suggestedTruck
                    ? `Suggested larger truck: ${formatSuggestedTruckLabel(suggestedTruck.truck)} (${suggestedTruck.capacityKg.toLocaleString('en-ZA')} kg · ${suggestedTruck.utilizationPct}% load).`
                    : 'Choose a higher-tonnage truck.'}
                </span>
              </span>
              {suggestedTruck ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 shrink-0 bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setVehicleAssetUid(String(suggestedTruck.truck.uid))}
                >
                  Switch truck
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Truck</Label>
              {invoiceWeightKg > 0 ? (
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
              emptyMessage="No truck fits this invoice weight."
              triggerIcon={<Truck className="size-4 shrink-0" />}
              triggerClassName="h-9 w-full sm:w-full max-w-full overflow-hidden"
            />
            {suggestedTruck && !isTruckOverloaded ? (
              <div
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs',
                  suggestedTruck.direction === 'larger'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200',
                )}
              >
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <Lightbulb
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      suggestedTruck.direction === 'larger' ? 'text-amber-500' : 'text-sky-500',
                    )}
                    aria-hidden
                  />
                  <span>
                    This invoice uses <span className="font-medium">{loadUtilizationPct ?? 0}%</span>{' '}
                    of the selected truck (ideal 60–80%). Consider a{' '}
                    {suggestedTruck.direction === 'larger' ? 'larger' : 'smaller'} truck:{' '}
                    <span className="font-medium">
                      {formatSuggestedTruckLabel(suggestedTruck.truck)}
                    </span>{' '}
                    ({suggestedTruck.capacityKg.toLocaleString('en-ZA')} kg ·{' '}
                    {suggestedTruck.utilizationPct}% load).
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    'h-7 shrink-0',
                    suggestedTruck.direction === 'larger'
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:text-amber-100'
                      : 'border-sky-500/40 bg-sky-500/15 text-sky-900 hover:bg-sky-500/25 dark:text-sky-100',
                  )}
                  onClick={() => setVehicleAssetUid(String(suggestedTruck.truck.uid))}
                >
                  Switch truck
                </Button>
              </div>
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
              emptyMessage="No driver profiles found."
              triggerIcon={<Truck className="size-4 shrink-0" />}
              triggerClassName="h-9 w-full sm:w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="reassign-route">Route code</Label>
              <Input
                id="reassign-route"
                value={routeCode}
                onChange={(event) => setRouteCode(event.target.value)}
                placeholder="GP-07"
                aria-label="Destination route code"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="reassign-fuel">Fuel filled (litres, optional)</Label>
              <div className="relative">
                <Fuel className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  id="reassign-fuel"
                  type="number"
                  min={0}
                  step="0.1"
                  inputMode="decimal"
                  value={departureFuelLitres}
                  onChange={(event) => setDepartureFuelLitres(event.target.value)}
                  placeholder="Keep existing"
                  aria-label="Updated fuel filled in litres"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="reassign-date">Scheduled day</Label>
            <DatePickerField
              id="reassign-date"
              value={scheduledDate}
              onChange={setScheduledDate}
              aria-label="Destination scheduled day"
              className="w-full"
            />
          </div>

          {reassign.isError ? (
            <p className="text-destructive text-sm">{getQueryErrorMessage(reassign.error)}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={reassign.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={!isComplete || reassign.isPending}
            >
              {reassign.isPending ? 'Reassigning…' : 'Save reassignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
