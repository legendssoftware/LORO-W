'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Building2, Fuel, Mail, MapPin, Phone, Route, User } from 'lucide-react';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CompetitorRevenueEditor } from '@/app/visualiser/components/competitor-revenue-editor';
import type { RepJourneyRange, RepJourneySummary } from '@/api/types/tracking';

function Row({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p className="text-muted-foreground flex items-start gap-1.5 font-sans text-xs">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground text-sm font-semibold tabular-nums break-words">
        {value}
      </p>
    </div>
  );
}

const TRACE_RANGES: { range: RepJourneyRange; label: string }[] = [
  { range: 'hour', label: 'Hour' },
  { range: 'day', label: 'Day' },
  { range: 'week', label: 'Week' },
];

function formatKm(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} km`;
}

function formatSpeed(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} km/h`;
}

function formatFuel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `R${value.toFixed(2)}`;
  }
}

export type MapFeaturePopupContentProps = {
  point: VisualiserMapPoint;
  activeTraceRange?: RepJourneyRange | null;
  isTracing?: boolean;
  journeySummary?: RepJourneySummary | null;
  onTraceRoute?: (repUid: number, range: RepJourneyRange) => void;
  onClearRoute?: () => void;
};

/**
 * Rich popup body for a visualiser map feature.
 */
export function MapFeaturePopupContent({
  point,
  activeTraceRange = null,
  isTracing = false,
  journeySummary = null,
  onTraceRoute,
  onClearRoute,
}: MapFeaturePopupContentProps) {
  const meta = LAYER_META[point.layer];
  const recorded =
    point.recordedAt &&
    (() => {
      try {
        return new Date(point.recordedAt).toLocaleString();
      } catch {
        return point.recordedAt;
      }
    })();

  const highlights =
    point.highlights && point.highlights.length > 0
      ? point.highlights
      : point.metricLabel && point.metricValue
        ? [{ label: point.metricLabel, value: point.metricValue }]
        : [];

  const canTrace =
    point.layer === 'reps' &&
    point.repUid != null &&
    typeof onTraceRoute === 'function';

  const showSummary =
    canTrace && activeTraceRange != null && journeySummary != null;

  return (
    <div className="min-w-52 max-w-80 space-y-2.5 pr-1 font-sans">
      <div className="flex items-start gap-2.5">
        {point.logoUrl ? (
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border/60 bg-background/40">
            <Image
              src={point.logoUrl}
              alt=""
              fill
              className="object-contain p-0.5"
              unoptimized
            />
          </div>
        ) : (
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {meta.label}
          </p>
          <h3 className="text-foreground leading-snug font-semibold">
            {point.name}
          </h3>
          {point.subtitle && point.subtitle !== point.address ? (
            <p className="text-muted-foreground text-xs">{point.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Row icon={<MapPin className="size-3.5" />}>{point.address}</Row>
        <Row icon={<User className="size-3.5" />}>{point.contact}</Row>
        <Row icon={<Phone className="size-3.5" />}>{point.phone}</Row>
        <Row icon={<Mail className="size-3.5" />}>{point.email}</Row>
        <Row icon={<Building2 className="size-3.5" />}>
          {[point.branchLabel, point.positionLabel].filter(Boolean).join(' · ') ||
            null}
        </Row>
      </div>

      {highlights.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {highlights.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5"
            >
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {item.label}
              </p>
              <p className="text-foreground text-sm font-semibold tabular-nums break-words">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {point.layer === 'competitors' && point.competitorUid != null ? (
        <CompetitorRevenueEditor point={point} />
      ) : null}

      {canTrace ? (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
            <Route className="size-3" />
            Trace route
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TRACE_RANGES.map(({ range, label }) => (
              <Button
                key={range}
                type="button"
                size="xs"
                variant={activeTraceRange === range ? 'default' : 'outline'}
                disabled={isTracing}
                onClick={() => onTraceRoute?.(point.repUid as number, range)}
              >
                {label}
              </Button>
            ))}
            {activeTraceRange ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={isTracing}
                onClick={() => onClearRoute?.()}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSummary && journeySummary ? (
        <div className="space-y-2 border-t border-border/40 pt-2">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Journey summary
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <StatCell
              label="Points"
              value={String(journeySummary.totalPoints)}
            />
            <StatCell
              label="Total km"
              value={formatKm(journeySummary.totalDistanceKm)}
            />
            <StatCell
              label="Travel time"
              value={journeySummary.totalTravelFormatted || '—'}
            />
            <StatCell
              label="Avg speed"
              value={formatSpeed(journeySummary.averageSpeedKmh)}
            />
            <StatCell
              label="Stop time"
              value={journeySummary.totalStopFormatted || '—'}
            />
          </div>

          {(journeySummary.startPlace || journeySummary.endPlace) ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Route
              </p>
              {journeySummary.startPlace ? (
                <p className="text-muted-foreground text-[11px] leading-snug">
                  <span className="text-foreground font-medium">Start:</span>{' '}
                  {journeySummary.startPlace.address?.trim() ||
                    `${journeySummary.startPlace.latitude.toFixed(4)}, ${journeySummary.startPlace.longitude.toFixed(4)}`}
                  {journeySummary.startPlace.recordedAt ? (
                    <span className="text-muted-foreground mt-0.5 block text-[10px] tabular-nums">
                      {(() => {
                        try {
                          return new Date(
                            journeySummary.startPlace.recordedAt
                          ).toLocaleString();
                        } catch {
                          return journeySummary.startPlace.recordedAt;
                        }
                      })()}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {journeySummary.endPlace ? (
                <p className="text-muted-foreground text-[11px] leading-snug">
                  <span className="text-foreground font-medium">End:</span>{' '}
                  {journeySummary.endPlace.address?.trim() ||
                    `${journeySummary.endPlace.latitude.toFixed(4)}, ${journeySummary.endPlace.longitude.toFixed(4)}`}
                  {journeySummary.endPlace.recordedAt ? (
                    <span className="text-muted-foreground mt-0.5 block text-[10px] tabular-nums">
                      {(() => {
                        try {
                          return new Date(
                            journeySummary.endPlace.recordedAt
                          ).toLocaleString();
                        } catch {
                          return journeySummary.endPlace.recordedAt;
                        }
                      })()}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
            <p className="text-muted-foreground flex items-center gap-1 text-[10px] tracking-wide uppercase">
              <Fuel className="size-3" />
              Avg fuel today
            </p>
            <p className="text-foreground text-sm font-semibold tabular-nums">
              {formatFuel(journeySummary.fuelPrice.averagePetrolPerLitreZar)}
              <span className="text-muted-foreground ml-1 text-[11px] font-normal">
                / L
                {journeySummary.fuelPrice.grade
                  ? ` · ${journeySummary.fuelPrice.grade}`
                  : ''}
              </span>
            </p>
            {!journeySummary.fuelPrice.averagePetrolPerLitreZar ? (
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                Set FUEL_SA_API_KEY on the server to load Fuel SA prices
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Avg speed · distance
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['Day', journeySummary.periodAverages.day],
                  ['Week', journeySummary.periodAverages.week],
                  ['Month', journeySummary.periodAverages.month],
                ] as const
              ).map(([label, stats]) => (
                <div
                  key={label}
                  className="rounded-md border border-border/50 bg-background/40 px-1.5 py-1.5 text-center"
                >
                  <p className="text-muted-foreground text-[9px] uppercase">
                    {label}
                  </p>
                  <p className="text-foreground text-[11px] font-semibold tabular-nums leading-tight">
                    {formatSpeed(stats.averageSpeedKmh)}
                  </p>
                  <p className="text-muted-foreground text-[10px] tabular-nums">
                    {formatKm(stats.averageDistanceKm)}
                    {label !== 'Day' ? '/d' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {journeySummary.prominentLocations.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Common visited places
              </p>
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                {journeySummary.prominentLocations.map((loc) => (
                  <li
                    key={`${loc.latitude}-${loc.longitude}-${loc.address}`}
                    className="text-muted-foreground rounded-md border border-border/40 bg-background/30 px-2 py-1 text-[11px]"
                  >
                    <span className="text-foreground font-medium">
                      {loc.timeSpentFormatted}
                    </span>
                    {' · '}
                    <span className="break-words">{loc.address}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {point.status ? (
        <p className="text-muted-foreground text-[11px]">
          Status:{' '}
          <span className="text-foreground font-medium capitalize">
            {point.status}
          </span>
        </p>
      ) : null}

      {recorded ? (
        <p className={cn('text-muted-foreground text-[11px]')}>
          Last seen: {recorded}
        </p>
      ) : null}
    </div>
  );
}
