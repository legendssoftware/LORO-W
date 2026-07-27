'use client';

import { Battery, MapPin, Smartphone } from 'lucide-react';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import {
  formatAbsoluteRecordedAt,
  formatRelativeRecordedAt,
} from '@/lib/utils/journey-point-format';

export type JourneyLastKnownPopupProps = {
  /** Live latest-rep pin when available. */
  point?: VisualiserMapPoint | null;
  /** Fallback when latest GPS pin is missing (journey end). */
  fallback?: {
    address: string | null;
    latitude: number;
    longitude: number;
    recordedAt: string;
  } | null;
};

function highlightValue(
  point: VisualiserMapPoint | null | undefined,
  label: string
): string | null {
  const value = point?.highlights?.find((h) => h.label === label)?.value;
  if (!value || value === '—') return null;
  return value;
}

/**
 * Popup body for the tracked rep’s last-known phone GPS (device + freshness).
 */
export function JourneyLastKnownPopupContent({
  point = null,
  fallback = null,
}: JourneyLastKnownPopupProps) {
  const address =
    point?.address?.trim() ||
    fallback?.address?.trim() ||
    (fallback
      ? `${fallback.latitude.toFixed(5)}, ${fallback.longitude.toFixed(5)}`
      : null) ||
    'Unknown location';

  const recordedAt = point?.recordedAt ?? fallback?.recordedAt ?? null;
  const relative = formatRelativeRecordedAt(recordedAt);
  const absolute = formatAbsoluteRecordedAt(recordedAt);

  const battery = highlightValue(point, 'Battery');
  const device = highlightValue(point, 'Device');
  const os = highlightValue(point, 'OS');
  const heading = highlightValue(point, 'Heading');
  const speed = highlightValue(point, 'Speed');
  const network = highlightValue(point, 'Network');

  const metaRows: { label: string; value: string }[] = [];
  if (battery) metaRows.push({ label: 'Battery', value: battery });
  if (device) metaRows.push({ label: 'Device', value: device });
  if (os) metaRows.push({ label: 'OS', value: os });
  if (heading) metaRows.push({ label: 'Heading', value: heading });
  if (speed) metaRows.push({ label: 'Speed', value: speed });
  if (network) metaRows.push({ label: 'Network', value: network });

  return (
    <div className="min-w-48 max-w-64 space-y-2 pr-1 font-sans text-xs">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex size-1.5 rounded-full bg-violet-600" />
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Last known location
        </p>
      </div>

      {relative ? (
        <p className="text-foreground text-sm font-semibold leading-snug">
          {relative}
        </p>
      ) : null}

      <p className="text-muted-foreground flex items-start gap-1.5 leading-snug">
        <MapPin className="mt-0.5 size-3 shrink-0" />
        <span className="min-w-0 break-words">{address}</span>
      </p>

      {absolute ? (
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {absolute}
        </p>
      ) : null}

      {metaRows.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 border-t border-border/40 pt-2">
          {metaRows.map((row) => (
            <div
              key={row.label}
              className="rounded-md border border-border/40 bg-background/40 px-1.5 py-1"
            >
              <p className="text-muted-foreground flex items-center gap-0.5 text-[9px] tracking-wide uppercase">
                {row.label === 'Battery' ? (
                  <Battery className="size-2.5" />
                ) : null}
                {row.label === 'Device' ? (
                  <Smartphone className="size-2.5" />
                ) : null}
                {row.label}
              </p>
              <p className="text-foreground text-[11px] font-medium leading-tight break-words">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground border-t border-border/40 pt-2 text-[10px]">
          Device tracking details unavailable for this ping.
        </p>
      )}
    </div>
  );
}
