'use client';

import type { TurnoverSimulation } from '@/lib/site-opportunity/turnover-simulation';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import { cn } from '@/lib/utils';

function formatVarianceLabel(variancePct: number): string {
  const rounded = Math.round(Math.abs(variancePct));
  if (variancePct > 0) return `${rounded}% above model`;
  if (variancePct < 0) return `${rounded}% below model`;
  return 'Matches model';
}

export function ActualVsSimulatedTurnover({
  simulation,
  compact = false,
  className,
}: {
  simulation: Pick<
    TurnoverSimulation,
    'actualMonthlyZAR' | 'simulatedMonthlyZAR' | 'varianceZAR' | 'variancePct'
  >;
  compact?: boolean;
  className?: string;
}) {
  const hasActual =
    simulation.actualMonthlyZAR != null &&
    Number.isFinite(simulation.actualMonthlyZAR) &&
    simulation.actualMonthlyZAR > 0;

  const variancePct = simulation.variancePct;
  const varianceClass =
    variancePct == null
      ? 'text-neutral-600'
      : variancePct > 5
        ? 'text-green-700'
        : variancePct < -5
          ? 'text-amber-700'
          : 'text-neutral-600';

  return (
    <div
      className={cn(
        compact ? 'space-y-1' : 'space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5',
        className,
      )}
    >
      <p
        className={cn(
          'font-semibold uppercase tracking-wide text-neutral-700',
          compact ? 'text-[10px]' : 'text-xs',
        )}
      >
        Actual vs simulated (monthly)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className={cn('text-neutral-700', compact ? 'text-[10px]' : 'text-xs')}>
            Actual (ERP)
          </p>
          <p
            className={cn(
              'font-semibold text-neutral-900 tabular-nums',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {hasActual
              ? `${formatZarShort(simulation.actualMonthlyZAR!)}/mo`
              : '—'}
          </p>
        </div>
        <div>
          <p className={cn('text-neutral-700', compact ? 'text-[10px]' : 'text-xs')}>
            Simulated (model)
          </p>
          <p
            className={cn(
              'font-semibold text-neutral-900 tabular-nums',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {formatZarShort(simulation.simulatedMonthlyZAR)}/mo
          </p>
        </div>
      </div>
      {hasActual && variancePct != null ? (
        <p className={cn('tabular-nums', varianceClass, compact ? 'text-[10px]' : 'text-xs')}>
          {formatVarianceLabel(variancePct)}
          {simulation.varianceZAR != null ? (
            <span className="text-neutral-600">
              {' '}
              ({simulation.varianceZAR >= 0 ? '+' : ''}
              {formatZarShort(simulation.varianceZAR)}/mo)
            </span>
          ) : null}
        </p>
      ) : (
        <p className={cn('text-neutral-600', compact ? 'text-[10px]' : 'text-xs')}>
          No ERP data for this branch yet.
        </p>
      )}
    </div>
  );
}
