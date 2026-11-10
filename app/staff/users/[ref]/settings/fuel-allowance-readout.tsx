'use client';

import { useFuelBalance } from '@/api/hooks';
import { formatFuelZar } from '@/app/staff/components/fuel-allowance-meter';

/**
 * Read-only spend against the Fuel costing field. The input above stays the amount given.
 */
export function FuelAllowanceReadout({ userRef }: { userRef: string }) {
  const query = useFuelBalance(userRef);
  const balance = query.data;

  if (query.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading fuel balance…</p>;
  }
  if (query.isError || !balance) {
    return <p className="text-xs text-muted-foreground">Fuel balance is unavailable.</p>;
  }
  if (!balance.hasAllowance) {
    return <p className="text-xs text-muted-foreground">No fuel allowance for this period.</p>;
  }
  if (!balance.hasRatedVehicle) {
    return (
      <p className="text-xs text-muted-foreground">
        {formatFuelZar(balance.allowanceZar)} allowance. Fuel is not deducted until a vehicle with a rated km/L is assigned.
      </p>
    );
  }

  const remaining = balance.balanceZar ?? balance.allowanceZar;
  const overspent = remaining < 0;

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
      <p className={overspent ? 'text-sm text-red-600' : 'text-sm'}>
        <strong>{formatFuelZar(remaining)}</strong>
        <span className="text-muted-foreground"> left of {formatFuelZar(balance.allowanceZar)}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {balance.distanceKm.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} km ·{' '}
        {balance.litres.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} L · spent{' '}
        {formatFuelZar(balance.spentZar)}
        <span className="ml-1">
          ({balance.periodStart} – {balance.periodEnd})
        </span>
      </p>
      {balance.days.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
          {balance.days.map((day) => (
            <li key={day.date} className="flex items-center justify-between gap-3 tabular-nums">
              <span className="text-muted-foreground">{day.date}</span>
              <span>
                {day.distanceKm.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} km ·{' '}
                {day.litres.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} L ·{' '}
                {formatFuelZar(day.costZar)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No billable travel in this period yet.</p>
      )}
    </div>
  );
}
