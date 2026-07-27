'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type * as GeoJSON from 'geojson';
import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  User,
} from 'lucide-react';
import {
  Map as MapView,
  MapClusterLayer,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
} from '@/components/ui/map';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { VisitListItem } from '@/api/types/visits';
import { cn } from '@/lib/utils';

const FALLBACK_CENTER: [number, number] = [28.0473, -26.2041];

/** Prefer DOM markers for small sets; cluster GeoJSON for larger ranges. */
const CLUSTER_THRESHOLD = 40;

const CLUSTER_COLORS: [string, string, string] = [
  '#059669',
  '#047857',
  '#065f46',
];

type AddressCoords = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  formattedAddress?: string;
};

function parseLatLng(raw: string | null | undefined): { lat: number; lng: number } | null {
  if (!raw || raw === '-') return null;
  const parts = raw.split(',').map((p) => Number.parseFloat(p.trim()));
  if (parts.length < 2) return null;
  const [lat, lng] = parts;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

function parseStoredCoords(
  latRaw: number | string | null | undefined,
  lngRaw: number | string | null | undefined
): { lat: number; lng: number } | null {
  const lat = typeof latRaw === 'string' ? Number.parseFloat(latRaw) : Number(latRaw);
  const lng = typeof lngRaw === 'string' ? Number.parseFloat(lngRaw) : Number(lngRaw);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

/**
 * Resolve map coordinates for a check-in: GPS string first, then geocoded fullAddress.
 */
export function resolveVisitCoords(
  checkIn: VisitListItem
): { lat: number; lng: number } | null {
  const fromLocation = parseLatLng(checkIn.checkInLocation);
  if (fromLocation) return fromLocation;

  const fullAddress = checkIn.fullAddress as AddressCoords | null | undefined;
  const fromFull = parseStoredCoords(fullAddress?.latitude, fullAddress?.longitude);
  if (fromFull) return fromFull;

  const contactAddress = checkIn.contactAddress as AddressCoords | null | undefined;
  return parseStoredCoords(contactAddress?.latitude, contactAddress?.longitude);
}

function ownerDisplayName(owner: VisitListItem['owner']): string {
  if (!owner) return '';
  const full = [owner.name, owner.surname].filter(Boolean).join(' ').trim();
  return full || owner.email?.trim() || '';
}

function ownerInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function ownerPhotoUrl(owner: VisitListItem['owner']): string | undefined {
  if (!owner) return undefined;
  const url =
    (typeof owner.photoURL === 'string' && owner.photoURL.trim()) ||
    (typeof owner.avatar === 'string' && owner.avatar.trim()) ||
    '';
  return url || undefined;
}

function branchLabel(checkIn: VisitListItem): string | undefined {
  const branch = checkIn.branch ?? checkIn.owner?.branch;
  if (!branch) return undefined;
  const name = branch.name?.trim() || branch.alias?.trim();
  return name || undefined;
}

function formatDateTime(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return new Date(raw).toLocaleString();
  } catch {
    return raw;
  }
}

function formatMoney(value: number | null | undefined): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return `R${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function addressDisplayLabel(
  checkIn: VisitListItem,
  coords: { lat: number; lng: number }
): string {
  const fullAddress = checkIn.fullAddress as AddressCoords | null | undefined;
  const formatted = fullAddress?.formattedAddress?.trim();
  if (formatted) return formatted;
  return formatCoords(coords.lat, coords.lng);
}

export type VisitMapPoint = {
  id: number;
  latitude: number;
  longitude: number;
  label: string;
  ownerName: string;
  photoURL?: string;
  placeName: string;
  contactName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  branchName?: string;
  methodOfContact?: string;
  buildingType?: string;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: string;
  salesValue?: number | null;
  quotationNumber?: string;
  quotationAmount?: string;
  notes?: string;
  resolution?: string;
  addressLabel?: string;
};

type VisitClusterProps = {
  id: number;
  label: string;
};

export function visitMapPointsFromCheckIns(
  checkIns: VisitListItem[] | undefined | null
): VisitMapPoint[] {
  const points: VisitMapPoint[] = [];
  for (const c of checkIns ?? []) {
    const coords = resolveVisitCoords(c);
    if (!coords) continue;
    const placeName =
      c.companyName?.trim() ||
      c.client?.name?.trim() ||
      c.contactFullName?.trim() ||
      `Visit #${c.uid}`;
    const ownerName = ownerDisplayName(c.owner);
    const label = ownerName ? `${ownerName} · ${placeName}` : placeName;
    const quotationAmount =
      c.quotation?.totalAmount != null
        ? formatMoney(Number(c.quotation.totalAmount))
        : undefined;

    points.push({
      id: c.uid,
      latitude: coords.lat,
      longitude: coords.lng,
      label,
      ownerName: ownerName || placeName,
      photoURL: ownerPhotoUrl(c.owner),
      placeName,
      contactName: c.contactFullName?.trim() || undefined,
      ownerPhone: c.owner?.phone?.trim() || undefined,
      ownerEmail: c.owner?.email?.trim() || undefined,
      branchName: branchLabel(c),
      methodOfContact: c.methodOfContact?.trim() || undefined,
      buildingType: c.buildingType?.trim() || undefined,
      checkInTime: c.checkInTime,
      checkOutTime: c.checkOutTime ?? undefined,
      duration: c.duration?.trim() || undefined,
      salesValue: c.salesValue,
      quotationNumber: c.quotation?.quotationNumber?.trim() || undefined,
      quotationAmount,
      notes: c.notes?.trim() || undefined,
      resolution: c.resolution?.trim() || undefined,
      addressLabel: addressDisplayLabel(c, coords),
    });
  }
  return points;
}

function PopupRow({
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

function VisitMapPopupContent({ point }: { point: VisitMapPoint }) {
  const checkInLabel = formatDateTime(point.checkInTime);
  const checkOutLabel = formatDateTime(point.checkOutTime);
  const salesLabel = formatMoney(point.salesValue ?? undefined);

  const highlights: { label: string; value: string }[] = [];
  if (point.duration) highlights.push({ label: 'Duration', value: point.duration });
  if (salesLabel) highlights.push({ label: 'Sales', value: salesLabel });
  if (point.quotationAmount) {
    highlights.push({
      label: point.quotationNumber ? `Quote ${point.quotationNumber}` : 'Quote',
      value: point.quotationAmount,
    });
  }
  if (point.buildingType) {
    highlights.push({ label: 'Site', value: point.buildingType });
  }

  return (
    <div className="min-w-52 max-w-80 space-y-2.5 pr-1 font-sans">
      <div className="flex items-start gap-2.5">
        <Avatar className="size-10 shrink-0 rounded-md border border-border/60">
          {point.photoURL ? (
            <AvatarImage src={point.photoURL} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback className="rounded-md bg-emerald-600 text-[11px] font-semibold text-white">
            {ownerInitials(point.ownerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Visit
          </p>
          <h3 className="text-foreground leading-snug font-semibold">
            {point.placeName}
          </h3>
          {point.ownerName && point.ownerName !== point.placeName ? (
            <p className="text-muted-foreground text-xs">{point.ownerName}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <PopupRow icon={<MapPin className="size-3.5" />}>
          {point.addressLabel}
        </PopupRow>
        <PopupRow icon={<User className="size-3.5" />}>
          {point.contactName}
        </PopupRow>
        <PopupRow icon={<Phone className="size-3.5" />}>
          {point.ownerPhone}
        </PopupRow>
        <PopupRow icon={<Mail className="size-3.5" />}>
          {point.ownerEmail}
        </PopupRow>
        <PopupRow icon={<Building2 className="size-3.5" />}>
          {[point.branchName, point.methodOfContact].filter(Boolean).join(' · ') ||
            null}
        </PopupRow>
        <PopupRow icon={<Clock className="size-3.5" />}>
          {[checkInLabel, checkOutLabel]
            .filter(Boolean)
            .join(' → ') || null}
        </PopupRow>
        {point.notes ? (
          <PopupRow icon={<NotebookPen className="size-3.5" />}>
            {point.notes.length > 160
              ? `${point.notes.slice(0, 157)}…`
              : point.notes}
          </PopupRow>
        ) : null}
        {point.resolution ? (
          <PopupRow icon={<CheckCircle2 className="size-3.5" />}>
            {point.resolution}
          </PopupRow>
        ) : null}
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

      {checkInLabel ? (
        <p className="text-muted-foreground border-t border-border/40 pt-2 text-[11px]">
          Checked in {checkInLabel}
        </p>
      ) : null}
    </div>
  );
}

interface ReportsVisitsMapProps {
  points: VisitMapPoint[];
  /** Total check-ins in range (including those without mappable coords). */
  totalVisits?: number;
  className?: string;
}

export function ReportsVisitsMap({
  points,
  totalVisits,
  className,
}: ReportsVisitsMapProps) {
  const [selected, setSelected] = useState<VisitMapPoint | null>(null);
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);

  const useClustering = points.length > CLUSTER_THRESHOLD;

  const pointsById = useMemo(() => {
    const map = new Map<number, VisitMapPoint>();
    for (const p of points) map.set(p.id, p);
    return map;
  }, [points]);

  const clusterGeoJson = useMemo((): GeoJSON.FeatureCollection<
    GeoJSON.Point,
    VisitClusterProps
  > => {
    return {
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature',
        properties: { id: p.id, label: p.label },
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
      })),
    };
  }, [points]);

  const pointsCenter = useMemo((): [number, number] => {
    if (points.length === 0) return FALLBACK_CENTER;
    const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    return [lng, lat];
  }, [points]);

  /** Prefer browser geolocation; fall back to visit centroid / Joburg. */
  const center = userCenter ?? pointsCenter;
  const zoom = userCenter ? 11 : points.length === 1 ? 12 : 5;

  const mappedCount = points.length;
  const rangeTotal =
    totalVisits != null && Number.isFinite(totalVisits)
      ? Math.max(0, Math.round(totalVisits))
      : mappedCount;
  const countLabel =
    mappedCount === 0
      ? null
      : rangeTotal > mappedCount
        ? `${mappedCount.toLocaleString()} of ${rangeTotal.toLocaleString()} visits mapped`
        : `${mappedCount.toLocaleString()} visit${mappedCount === 1 ? '' : 's'} mapped`;

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setUserCenter([pos.coords.longitude, pos.coords.latitude]);
      },
      () => {
        /* permission denied / timeout — keep points center */
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return null;
      return pointsById.get(prev.id) ?? null;
    });
  }, [pointsById]);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          'flex h-[280px] flex-col items-center justify-center gap-1 px-4 text-center',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">No mapped visits in range</p>
        {rangeTotal > 0 ? (
          <p className="text-muted-foreground text-xs">
            {rangeTotal.toLocaleString()} visit
            {rangeTotal === 1 ? '' : 's'} in range lack GPS coordinates
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-[280px] w-full overflow-hidden rounded-lg border border-border',
        className
      )}
    >
      {countLabel ? (
        <div className="pointer-events-none absolute top-2 left-2 z-10 rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-sm">
          {countLabel}
        </div>
      ) : null}
      <MapView
        key={
          userCenter
            ? `loc-${userCenter[0].toFixed(4)}-${userCenter[1].toFixed(4)}`
            : `points-${points.length}`
        }
        center={center}
        zoom={zoom}
        className="size-full"
      >
        <MapControls
          showZoom
          showLocate
          showFullscreen
          onLocate={(coords) => {
            setUserCenter([coords.longitude, coords.latitude]);
          }}
        />

        {useClustering ? (
          <MapClusterLayer<VisitClusterProps>
            data={clusterGeoJson}
            clusterColors={CLUSTER_COLORS}
            pointColor="#059669"
            clusterMaxZoom={14}
            clusterRadius={48}
            onPointClick={(feature) => {
              const id = Number(feature.properties?.id);
              if (!Number.isFinite(id)) return;
              const point = pointsById.get(id);
              if (point) setSelected(point);
            }}
          />
        ) : (
          points.map((p) => (
            <MapMarker
              key={p.id}
              longitude={p.longitude}
              latitude={p.latitude}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(p);
              }}
            >
              <MarkerContent>
                <Avatar
                  className={cn(
                    'size-8 cursor-pointer border-2 border-white shadow-md ring-1 ring-black/10 transition-transform',
                    selected?.id === p.id && 'scale-110 ring-2 ring-emerald-500'
                  )}
                  title={p.label}
                  aria-label={`Open visit details for ${p.label}`}
                >
                  {p.photoURL ? (
                    <AvatarImage src={p.photoURL} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-emerald-600 text-[10px] font-semibold text-white">
                    {ownerInitials(p.ownerName)}
                  </AvatarFallback>
                </Avatar>
              </MarkerContent>
            </MapMarker>
          ))
        )}

        {selected ? (
          <MapPopup
            key={selected.id}
            longitude={selected.longitude}
            latitude={selected.latitude}
            offset={28}
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            onClose={() => setSelected(null)}
            className="min-w-56 border-border/50 bg-background/75 font-sans shadow-none backdrop-blur-md"
          >
            <VisitMapPopupContent point={selected} />
          </MapPopup>
        ) : null}
      </MapView>
    </div>
  );
}
