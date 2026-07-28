'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Building2, Mail, MapPin, Phone, Route, User } from 'lucide-react';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CompetitorRevenueEditor } from '@/app/visualiser/components/competitor-revenue-editor';
import type { RepJourneyRange } from '@/api/types/tracking';

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

const TRACE_RANGES: { range: RepJourneyRange; label: string }[] = [
  { range: 'hour', label: 'Hour' },
  { range: 'day', label: 'Day' },
  { range: 'week', label: 'Week' },
];

export type MapFeaturePopupContentProps = {
  point: VisualiserMapPoint;
  activeTraceRange?: RepJourneyRange | null;
  isTracing?: boolean;
  onTraceRoute?: (repUid: number, range: RepJourneyRange) => void;
  onClearRoute?: () => void;
};

/**
 * Rich popup body for a visualiser map feature.
 * Rep popups expose Trace Hour/Day/Week + Clear only — trip detail lives in RepTrackerControl.
 */
export function MapFeaturePopupContent({
  point,
  activeTraceRange = null,
  isTracing = false,
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
