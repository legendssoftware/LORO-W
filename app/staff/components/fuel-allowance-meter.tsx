'use client';

import { ReportProgressBar } from '@/app/staff/components/report-progress-bar';
import type { FuelAllowanceBalance } from '@/api/endpoints/fuel-allowance';
import { cn } from '@/lib/utils';

/** Rand amount for the staff card and the settings readout. */
export function formatFuelZar(value: number): string {
  return `R${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatKm(value: number): string {
  return `${value.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} km`;
}

function formatLitres(value: number): string {
  return `${value.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} L`;
}

/**
 * Remaining fuel allowance under the hours bar.
 * No allowance or no rated vehicle is a short label instead of a progress bar.
 */
export function FuelAllowanceMeter({
  balance,
  compact = false,
}: {
  balance: FuelAllowanceBalance | null | undefined;
  compact?: boolean;
}) {
  if (!balance) return null;

  if (!balance.hasAllowance) {
    return (
      <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
        No fuel allowance
      </p>
    );
  }

  if (!balance.hasRatedVehicle) {
    return (
      <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
        Fuel is not deducted
      </p>
    );
  }

  const allowance = balance.allowanceZar;
  const remaining = balance.balanceZar ?? allowance;
  const overspent = remaining < 0;
  const spentPercent =
    allowance > 0 ? Math.min(100, Math.max(0, (balance.spentZar / allowance) * 100)) : 0;

  return (
    <div className="min-w-0 space-y-1">
      <p
        className={cn(
          'flex items-center justify-between gap-2 min-w-0',
          compact ? 'text-[11px]' : 'text-xs',
          overspent ? 'text-red-600' : 'text-muted-foreground'
        )}
      >
        <span className="min-w-0 truncate">
          Fuel{' '}
          <strong className={overspent ? 'text-red-600' : 'text-foreground'}>
            {formatFuelZar(remaining)}
          </strong>{' '}
          left of {formatFuelZar(allowance)}
        </span>
        <span className="shrink-0 tabular-nums">
          {formatKm(balance.distanceKm)} · {formatLitres(balance.litres)}
        </span>
      </p>
      <ReportProgressBar value={spentPercent} tone={overspent ? 'danger' : 'default'} />
    </div>
  );
}
