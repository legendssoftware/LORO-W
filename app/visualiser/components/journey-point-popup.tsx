'use client';

import type { ReactNode } from 'react';
import { Clock, Compass, Gauge, MapPin, Navigation } from 'lucide-react';
import type { RepJourneyPoint } from '@/api/types/tracking';
import {
  formatAbsoluteRecordedAt,
  formatAccuracyMeters,
  formatHeading,
  formatRelativeRecordedAt,
  formatSpeedMps,
} from '@/lib/utils/journey-point-format';
import { cn } from '@/lib/utils';

export type JourneyPointPopupContentProps = {
  point: RepJourneyPoint;
  /** Travel direction along the trail at this point (degrees). */
  bearingDegrees?: number | null;
  isTrailEnd?: boolean;
};

function MetaCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  if (!value || value === '—') return null;
  return (
    <div className="rounded-md border border-border/40 bg-background/40 px-1.5 py-1">
      <p className="text-muted-foreground flex items-center gap-0.5 text-[9px] tracking-wide uppercase">
        {icon}
        {label}
      </p>
      <p className="text-foreground text-[11px] font-medium leading-tight tabular-nums break-words">
        {value}
      </p>
    </div>
  );
}

/**
 * Rich popup for a journey stop or movement key point.
 */
export function JourneyPointPopupContent({
  point,
  bearingDegrees = null,
  isTrailEnd = false,
}: JourneyPointPopupContentProps) {
  const isStop = Boolean(point.isStop);
  const address =
    point.address?.trim() ||
    `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
  const relative = formatRelativeRecordedAt(point.recordedAt);
  const absolute = formatAbsoluteRecordedAt(point.recordedAt);
  const direction = formatHeading(bearingDegrees);
  const speed = formatSpeedMps(point.speed);
  const accuracy = formatAccuracyMeters(point.accuracy);

  return (
    <div className="min-w-48 max-w-64 space-y-2 pr-1 font-sans text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
            isStop
              ? 'bg-violet-600/15 text-violet-800 dark:text-violet-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isStop ? 'Stop' : 'Key point'}
        </span>
        {isTrailEnd ? (
          <span className="rounded bg-violet-600/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-violet-700 uppercase dark:text-violet-300">
            Trail end
          </span>
        ) : null}
      </div>

      {isStop && point.stopDurationFormatted ? (
        <p className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
          <Clock className="size-3.5 shrink-0 text-violet-700" />
          Stopped {point.stopDurationFormatted}
          {point.stopDurationMinutes != null &&
          Number.isFinite(point.stopDurationMinutes) ? (
            <span className="text-muted-foreground text-[11px] font-normal">
              ({Math.round(point.stopDurationMinutes)} min)
            </span>
          ) : null}
        </p>
      ) : null}

      <p className="text-muted-foreground flex items-start gap-1.5 leading-snug">
        <MapPin className="mt-0.5 size-3 shrink-0" />
        <span className="min-w-0 break-words">{address}</span>
      </p>

      {(relative || absolute) && (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {relative ? (
            <span className="text-foreground font-medium">{relative}</span>
          ) : null}
          {relative && absolute ? ' · ' : null}
          {absolute ? (
            <span className="tabular-nums">{absolute}</span>
          ) : null}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5 border-t border-border/40 pt-2">
        <MetaCell
          label="Direction"
          value={direction}
          icon={<Compass className="size-2.5" />}
        />
        <MetaCell
          label="Speed"
          value={speed}
          icon={<Gauge className="size-2.5" />}
        />
        <MetaCell
          label="Accuracy"
          value={accuracy}
          icon={<Navigation className="size-2.5" />}
        />
        {isStop && point.stopDurationFormatted ? (
          <MetaCell
            label="Duration"
            value={point.stopDurationFormatted}
            icon={<Clock className="size-2.5" />}
          />
        ) : null}
      </div>
    </div>
  );
}
