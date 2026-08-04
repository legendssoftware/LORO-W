'use client';

import type { ReactNode } from 'react';
import type {
  RepJourneyEndpoint,
  RepJourneySummary,
} from '@/api/types/tracking';
import type { LastKnownLocationSummary } from '@/app/visualiser/lib/rep-tracker-types';
import {
  formatVisitActionTime,
  type JourneyVisitAction,
} from '@/app/visualiser/lib/journey-visit-actions';
import { formatRelativeRecordedAt } from '@/lib/utils/journey-point-format';
import {
  formatFuelAsOf,
  formatFuelZar,
  formatPaceLabel,
  resolveTripFuelEstimate,
} from '@/lib/utils/trip-fuel-estimate';
import { cn } from '@/lib/utils';

function formatKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return '0 km';
  return `${km.toFixed(1)} km`;
}

function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh <= 0) return '—';
  return `${kmh.toFixed(0)} km/h`;
}

function formatEndpoint(place: RepJourneyEndpoint | null | undefined): string {
  if (!place) return '—';
  if (place.address?.trim()) return place.address.trim();
  return `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
}

function formatEndpointTime(
  place: RepJourneyEndpoint | null | undefined
): string | null {
  if (!place?.recordedAt) return null;
  const d = new Date(place.recordedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveTotalDurationLabel(summary: RepJourneySummary): string {
  if (summary.totalDurationFormatted?.trim()) {
    return summary.totalDurationFormatted;
  }
  const start = summary.startPlace?.recordedAt;
  const end = summary.endPlace?.recordedAt;
  if (!start || !end) return '—';
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return '—';
  }
  const minutes = Math.round((endMs - startMs) / 60_000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins <= 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

type TripBreakdownPanelProps = {
  journeySummary: RepJourneySummary;
  rangeLabel?: string | null;
  lastKnownLocation?: LastKnownLocationSummary | null;
  onLastKnownClick?: () => void;
  visitActions?: JourneyVisitAction[];
  selectedVisitId?: number | null;
  onVisitActionClick?: (visit: JourneyVisitAction) => void;
  statusMessage?: string | null;
  className?: string;
};

export function TripBreakdownPanel({
  journeySummary,
  rangeLabel = null,
  lastKnownLocation = null,
  onLastKnownClick,
  visitActions = [],
  selectedVisitId = null,
  onVisitActionClick,
  statusMessage = null,
  className,
}: TripBreakdownPanelProps) {
  const fuelEstimate = resolveTripFuelEstimate(journeySummary);
  const fuelPrice = journeySummary.fuelPrice;
  const fuelAsOf = formatFuelAsOf(fuelPrice.asOf);
  const vehicleProfile = journeySummary.vehicleProfile;
  const consumption = journeySummary.consumptionComparison;
  const distanceAdjustment = journeySummary.distanceAdjustment;
  const billableDistanceKm =
    distanceAdjustment?.billableDistanceKm ?? journeySummary.totalDistanceKm;
  const hasCommuteDeduction =
    distanceAdjustment != null && distanceAdjustment.workCommuteDeductionKm > 0;

  const paceBadgeClass =
    consumption?.paceLabel === 'below_budget'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : consumption?.paceLabel === 'on_pace'
        ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
        : consumption?.paceLabel === 'above_budget'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border-border/40 bg-muted/30 text-muted-foreground';

  return (
    <div className={cn('space-y-3 border-t border-border/50 pt-2', className)}>
      <div>
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Trip breakdown
          {rangeLabel ? (
            <span className="ml-1 font-normal normal-case">· {rangeLabel}</span>
          ) : null}
        </p>
      </div>

      <BreakdownSection title="Trip window">
        <MetricRow label="Started" value={formatEndpointTime(journeySummary.startPlace) ?? '—'} />
        <MetricRow label="Ended" value={formatEndpointTime(journeySummary.endPlace) ?? '—'} />
        <MetricRow
          label="Total duration"
          value={resolveTotalDurationLabel(journeySummary)}
        />
      </BreakdownSection>

      <BreakdownSection title="Driving">
        {hasCommuteDeduction ? (
          <>
            <MetricRow
              label="Distance (billable)"
              value={formatKm(billableDistanceKm)}
              highlight
            />
            <MetricRow
              label="Recorded distance"
              value={formatKm(distanceAdjustment.recordedDistanceKm)}
            />
            <MetricRow
              label="Work commute excluded"
              value={`−${distanceAdjustment.workCommuteDeductionKm.toFixed(1)} km`}
            />
            <p className="text-muted-foreground px-0.5 text-[10px] leading-snug">
              Daily home↔office travel removed from fuel estimate (
              {distanceAdjustment.workCommuteKmPerDay} km ×{' '}
              {distanceAdjustment.calendarDaysInRange}{' '}
              {distanceAdjustment.calendarDaysInRange === 1 ? 'day' : 'days'})
            </p>
          </>
        ) : (
          <MetricRow
            label="Distance"
            value={formatKm(journeySummary.totalDistanceKm)}
          />
        )}
        <MetricRow
          label="Driving time"
          value={journeySummary.totalTravelFormatted || '—'}
        />
        <MetricRow
          label="Avg speed"
          value={formatSpeed(journeySummary.averageSpeedKmh)}
        />
      </BreakdownSection>

      <BreakdownSection title="Stops">
        <MetricRow
          label="Stop time"
          value={journeySummary.totalStopFormatted || '—'}
        />
        <MetricRow
          label="Stops"
          value={String(journeySummary.stopCount ?? 0)}
        />
        <MetricRow
          label="Avg stop"
          value={journeySummary.averageStopFormatted || '—'}
        />
      </BreakdownSection>

      {vehicleProfile ? (
        <BreakdownSection title="Vehicle">
          <MetricRow
            label="Make / model"
            value={
              [vehicleProfile.make, vehicleProfile.model]
                .filter(Boolean)
                .join(' ') || '—'
            }
          />
          {vehicleProfile.displayName ? (
            <MetricRow label="Name" value={vehicleProfile.displayName} />
          ) : null}
          <MetricRow
            label="Size"
            value={vehicleProfile.sizeClass ?? '—'}
          />
          <MetricRow
            label="Rated consumption"
            value={`${vehicleProfile.ratedKmPerLitre} km/L${
              vehicleProfile.source === 'fleet-default' ? ' (fleet default)' : ''
            }`}
          />
        </BreakdownSection>
      ) : null}

      <BreakdownSection title="Fuel estimate">
        {fuelPrice.averagePetrolPerLitreZar != null ? (
          <>
            <MetricRow
              label="Grade"
              value={
                [fuelPrice.grade, fuelPrice.region].filter(Boolean).join(' · ') ||
                'Petrol'
              }
            />
            {fuelPrice.refillBasis === 'journey-start' ? (
              <MetricRow label="Refill basis" value="Journey start location" />
            ) : null}
            <MetricRow
              label="Price per litre"
              value={`${formatFuelZar(fuelPrice.averagePetrolPerLitreZar)}/L`}
            />
            {fuelAsOf ? (
              <MetricRow
                label="Price as of"
                value={
                  fuelPrice.source === 'fuel-sa'
                    ? `${fuelAsOf} (Fuel SA)`
                    : fuelAsOf
                }
              />
            ) : null}
            {fuelEstimate ? (
              <>
                <MetricRow
                  label="Assumed consumption"
                  value={`${fuelEstimate.assumedKmPerLitre} km/L`}
                />
                <MetricRow
                  label="Est. litres"
                  value={`~${fuelEstimate.estimatedLitres.toFixed(1)} L`}
                />
                <MetricRow
                  label="Est. trip fuel cost"
                  value={formatFuelZar(fuelEstimate.estimatedCostZar)}
                  highlight
                />
              </>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground px-0.5 text-[11px] leading-snug">
            Fuel price unavailable — check FUEL_SA_API_KEY on the server.
          </p>
        )}
      </BreakdownSection>

      {consumption ? (
        <BreakdownSection title="Driving efficiency">
          {consumption.monthlyFuelAllowanceZar != null ? (
            <MetricRow
              label="Monthly fuel allowance"
              value={formatFuelZar(consumption.monthlyFuelAllowanceZar)}
            />
          ) : null}
          {consumption.monthlyKmBudget != null ? (
            <MetricRow
              label="Implied monthly km budget"
              value={`${consumption.monthlyKmBudget.toFixed(0)} km`}
            />
          ) : null}
          {consumption.dailyKmBudget != null ? (
            <MetricRow
              label="Daily km budget"
              value={`${consumption.dailyKmBudget.toFixed(0)} km`}
            />
          ) : null}
          <MetricRow
            label="Today's distance"
            value={formatKm(consumption.periodDistanceKm)}
          />
          <div className="flex items-center justify-between gap-2 py-1">
            <span className="text-muted-foreground text-[11px]">Budget pace</span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                paceBadgeClass
              )}
            >
              {formatPaceLabel(consumption.paceLabel)}
            </span>
          </div>
          {consumption.budgetPacePercent != null ? (
            <p className="text-muted-foreground px-0.5 text-[10px] leading-snug">
              {consumption.budgetPacePercent > 110
                ? `${(consumption.budgetPacePercent - 100).toFixed(0)}% above daily fuel budget pace`
                : consumption.budgetPacePercent < 90
                  ? `${(100 - consumption.budgetPacePercent).toFixed(0)}% below daily fuel budget pace`
                  : 'Within daily fuel budget pace'}
            </p>
          ) : null}
        </BreakdownSection>
      ) : null}

      <div className="space-y-1.5">
        <EndpointRow label="Start" place={journeySummary.startPlace} />
        <EndpointRow label="End" place={journeySummary.endPlace} />
        {lastKnownLocation ? (
          <LastKnownRow location={lastKnownLocation} onClick={onLastKnownClick} />
        ) : null}
      </div>

      {journeySummary.prominentLocations.length > 0 ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Common visited places
          </p>
          <ul className="max-h-24 space-y-1 overflow-y-auto">
            {journeySummary.prominentLocations.slice(0, 5).map((loc) => (
              <li
                key={`${loc.latitude}-${loc.longitude}-${loc.address}`}
                className="text-muted-foreground rounded-md border border-border/40 bg-background/40 px-2 py-1 text-[11px] leading-snug"
              >
                <span className="text-foreground font-medium tabular-nums">
                  {loc.timeSpentFormatted}
                </span>
                {' · '}
                <span className="break-words">{loc.address}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visitActions.length > 0 ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Visit actions · {visitActions.length}
          </p>
          <ul className="max-h-28 space-y-1 overflow-y-auto">
            {visitActions.map((visit) => {
              const time = formatVisitActionTime(visit.checkInTime);
              const isSelected = visit.id === selectedVisitId;
              return (
                <li key={visit.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-md border px-2 py-1 text-left text-[11px] leading-snug transition-colors',
                      isSelected
                        ? 'border-emerald-600/50 bg-emerald-500/10 text-foreground'
                        : 'border-border/40 bg-background/40 text-muted-foreground hover:border-border hover:bg-muted/40'
                    )}
                    onClick={() => onVisitActionClick?.(visit)}
                  >
                    <span className="text-foreground font-medium break-words">
                      {visit.placeName}
                    </span>
                    <span className="mt-0.5 block tabular-nums">
                      {[time, visit.duration].filter(Boolean).join(' · ') ||
                        'Visit'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="text-muted-foreground text-[10px] tabular-nums">
        {journeySummary.totalPoints} GPS points
        {visitActions.length > 0
          ? ` · ${visitActions.length} visit${visitActions.length === 1 ? '' : 's'}`
          : null}
        {statusMessage ? ` · ${statusMessage}` : null}
      </p>
    </div>
  );
}

function BreakdownSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[9px] font-medium tracking-wide uppercase">
        {title}
      </p>
      <div className="rounded-md border border-border/40 bg-background/30 px-2 py-1.5">
        {children}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-[11px]">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          'text-right tabular-nums',
          highlight ? 'text-foreground font-semibold' : 'text-foreground font-medium'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function EndpointRow({
  label,
  place,
}: {
  label: string;
  place: RepJourneyEndpoint | null;
}) {
  const time = formatEndpointTime(place);
  return (
    <div className="rounded-md border border-border/40 bg-background/30 px-2 py-1.5">
      <p className="text-muted-foreground text-[9px] tracking-wide uppercase">
        {label}
        {time ? (
          <span className="ml-1 font-normal normal-case tabular-nums">
            · {time}
          </span>
        ) : null}
      </p>
      <p className="text-foreground line-clamp-2 text-[11px] leading-snug break-words">
        {formatEndpoint(place)}
      </p>
    </div>
  );
}

function LastKnownRow({
  location,
  onClick,
}: {
  location: LastKnownLocationSummary;
  onClick?: () => void;
}) {
  const relative = formatRelativeRecordedAt(location.recordedAt);
  const address =
    location.address?.trim() ||
    `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  const deviceLine = [location.batteryLabel, location.deviceLabel]
    .filter((v) => v && v !== '—')
    .join(' · ');

  const body = (
    <>
      <p className="text-muted-foreground text-[9px] tracking-wide uppercase">
        Last known location
        {relative ? (
          <span className="ml-1 font-normal normal-case tabular-nums">
            · {relative}
          </span>
        ) : null}
      </p>
      <p className="text-foreground line-clamp-2 text-[11px] leading-snug break-words">
        {address}
      </p>
      {deviceLine ? (
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
          {deviceLine}
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="w-full rounded-md border border-violet-500/40 bg-violet-500/5 px-2 py-1.5 text-left transition-colors hover:bg-violet-500/10"
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-violet-500/40 bg-violet-500/5 px-2 py-1.5">
      {body}
    </div>
  );
}
