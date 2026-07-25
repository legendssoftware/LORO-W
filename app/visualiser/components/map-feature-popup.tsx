'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Building2, Mail, MapPin, Phone, User } from 'lucide-react';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';
import { cn } from '@/lib/utils';

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

/**
 * Rich popup body for a visualiser map feature.
 */
export function MapFeaturePopupContent({ point }: { point: VisualiserMapPoint }) {
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

  return (
    <div className="min-w-52 max-w-72 space-y-2.5 pr-1 font-sans">
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
          {point.subtitle ? (
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
              <p className="text-foreground text-sm font-semibold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
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
