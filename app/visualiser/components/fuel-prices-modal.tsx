'use client';

import { Fuel, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFuelPrices, useRefreshFuelPrices } from '@/api/hooks/use-rep-journey';
import type { FuelPriceLatestGrade, FuelPriceRefreshStatus } from '@/api/types/tracking';

interface FuelPricesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatStamp(iso: string | null): string {
  if (!iso) return 'Not updated yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatWeek(ymd: string | null): string | null {
  if (!ymd) return null;
  const date = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function GradeLine({ label, grade }: { label: string; grade: FuelPriceLatestGrade | null }) {
  if (!grade) {
    return (
      <p className="text-sm text-muted-foreground">
        {label}: no price stored
      </p>
    );
  }

  const local = formatMoney(grade.priceLocal, grade.currency);
  const zar =
    grade.currency !== 'ZAR' && grade.priceZar != null
      ? ` · ${formatMoney(grade.priceZar, 'ZAR')}`
      : '';

  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {local}
      {zar}
    </p>
  );
}

export function FuelPricesModal({ open, onOpenChange }: FuelPricesModalProps) {
  const pricesQuery = useFuelPrices(open);
  const fuelRefresh = useRefreshFuelPrices();
  const snapshot = pricesQuery.data;
  const pricedCountries =
    snapshot?.countries.filter((country) => country.petrol || country.diesel) ?? [];
  const weekLabel = formatWeek(snapshot?.sourceDate ?? null);

  async function handleUpdate(): Promise<void> {
    const toastId = 'fuel-price-refresh';
    toast.loading('Fetching petrol prices…', { id: toastId });
    try {
      const { message, data } = await fuelRefresh.mutateAsync();
      const status: FuelPriceRefreshStatus = data.status;
      switch (status) {
        case 'failed':
        case 'not-configured':
          toast.error(message, { id: toastId });
          return;
        case 'throttled':
          toast(message, { id: toastId });
          return;
        case 'fresh':
          toast.success('Petrol prices are already up to date', { id: toastId });
          return;
        case 'refreshed':
          toast.success(
            data.missingCountries.length > 0
              ? message
              : data.rows > 0
                ? `Updated ${data.rows} petrol price${data.rows === 1 ? '' : 's'}`
                : message,
            { id: toastId }
          );
          return;
        default: {
          const unhandled: never = status;
          toast.error(message || unhandled, { id: toastId });
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to fetch petrol prices',
        { id: toastId }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Petrol prices</DialogTitle>
          <DialogDescription>
            {snapshot
              ? `Source: GlobalPetrolPrices · Updated ${formatStamp(snapshot.updatedAt)}${
                  weekLabel ? ` · Price week ${weekLabel}` : ''
                }`
              : 'Stored national prices. Updating fetches the latest from GlobalPetrolPrices.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {pricesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading stored prices…
            </div>
          ) : pricesQuery.isError ? (
            <p className="text-sm text-destructive">
              {pricesQuery.error instanceof Error
                ? pricesQuery.error.message
                : 'Could not load petrol prices.'}
            </p>
          ) : pricedCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prices stored yet.</p>
          ) : (
            pricedCountries.map((country) => (
              <div key={country.countryCode} className="rounded-lg border px-3 py-2">
                <p className="text-sm font-medium">
                  {country.countryName ?? country.countryCode}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {country.countryCode}
                  </span>
                </p>
                <GradeLine label="Petrol" grade={country.petrol} />
                <GradeLine label="Diesel" grade={country.diesel} />
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={fuelRefresh.isPending}
            onClick={() => {
              void handleUpdate();
            }}
          >
            {fuelRefresh.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fuel className="size-4" />
            )}
            {fuelRefresh.isPending ? 'Updating…' : 'Update prices'}
          </Button>
          <Button type="button" variant="cancel" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
