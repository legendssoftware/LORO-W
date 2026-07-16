import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { divIcon } from 'leaflet';
import { Layers, type LucideIcon } from 'lucide-react';
import type { MapMarkerBase } from '@/api/types/map';
import {
  CLUSTER_MARKER_BG,
  MAP_ENTITY_MARKER_SIZE,
  MAP_ENTITY_MARKERS,
  MARKER_COLORS,
  resolveCompetitorMarkerColor,
  type MapEntityMarkerType,
} from '@/app/reports/components/map-report-constants';

const MARKER_SIZE = 36;
const MARKER_ANCHOR = MARKER_SIZE / 2;
const ICON_CACHE_MAX = 500;

class LRUCache<K, V> {
  private readonly max: number;
  private readonly map = new Map<K, V>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}

const iconCache = new LRUCache<string, ReturnType<typeof divIcon>>(ICON_CACHE_MAX);
const lucideCircleIconCache = new LRUCache<string, ReturnType<typeof divIcon>>(ICON_CACHE_MAX);
const logoCircleIconCache = new LRUCache<string, ReturnType<typeof divIcon>>(ICON_CACHE_MAX);

function getInitials(name: string): string {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function initialsSourceForVisitMarker(marker: MapMarkerBase): string {
  const o = marker.owner as { name?: string; surname?: string } | undefined;
  const fromOwner = [o?.name, o?.surname].filter(Boolean).join(' ').trim();
  if (fromOwner) return fromOwner;
  return String(marker.name ?? marker.id ?? 'visit');
}

function initialsSourceForLeadMarker(marker: MapMarkerBase): string {
  const o = marker.owner as { name?: string; surname?: string } | undefined;
  const fromOwner = [o?.name, o?.surname].filter(Boolean).join(' ').trim();
  if (fromOwner) return fromOwner;
  return String(marker.name ?? marker.id ?? 'lead');
}

function resolveCompetitorLogoUrl(marker: MapMarkerBase): string | undefined {
  const raw =
    marker.logoUrl?.trim() ||
    (typeof marker.logo === 'string' ? marker.logo.trim() : undefined);
  return raw || undefined;
}

function resolveBranchOrOrgLogoUrl(marker: MapMarkerBase): string | undefined {
  const raw =
    marker.logoUrl?.trim() ||
    (typeof marker.logo === 'string' ? marker.logo.trim() : undefined);
  return raw || undefined;
}

function resolveMarkerImageUrl(marker: MapMarkerBase): string | undefined {
  const mt = String(marker.markerType ?? '');
  if (mt === 'competitor') return resolveCompetitorLogoUrl(marker);
  if (mt === 'branch' || mt === 'org') return resolveBranchOrOrgLogoUrl(marker);
  if (
    ['check-in', 'shift-start', 'shift-end', 'break-start', 'break-end', 'claim'].includes(mt)
  ) {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    return img || owner?.photoURL || owner?.avatar;
  }
  if (mt === 'lead') {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    const ld = marker.leadData as { image?: string } | undefined;
    const loc = marker.location as { imageUrl?: string } | undefined;
    return img || owner?.photoURL || owner?.avatar || ld?.image || loc?.imageUrl;
  }
  if (mt === 'check-in-visit') {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    const ci = marker.checkInData as { checkInPhoto?: string } | undefined;
    return img || owner?.photoURL || owner?.avatar || ci?.checkInPhoto;
  }
  return undefined;
}

function genericPlaceholderChar(markerType: string): string {
  const m: Record<string, string> = {
    quotation: 'Q',
    task: 'T',
    journal: 'J',
    'check-in-visit': 'V',
    lead: 'L',
    claim: 'K',
  };
  return m[markerType] ?? markerType.slice(0, 1).toUpperCase();
}

function createLucideCircleMarkerIcon(
  bg: string,
  Icon: LucideIcon,
  cacheKey: string,
  size = MAP_ENTITY_MARKER_SIZE,
  extraClass = ''
): ReturnType<typeof divIcon> {
  const cached = lucideCircleIconCache.get(cacheKey);
  if (cached) return cached;

  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        className: extraClass || undefined,
        style: {
          backgroundColor: bg,
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
        },
      },
      createElement(Icon, { size: 16, color: 'white', strokeWidth: 2.5 })
    )
  );
  const icon = divIcon({
    html,
    className: `reports-viz-marker${extraClass ? ` ${extraClass}` : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  lucideCircleIconCache.set(cacheKey, icon);
  return icon;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function createLogoCircleMarkerIcon(
  logoUrl: string,
  ringColor: string,
  cacheKey: string,
  size = MAP_ENTITY_MARKER_SIZE,
  extraClass = ''
): ReturnType<typeof divIcon> {
  const cached = logoCircleIconCache.get(cacheKey);
  if (cached) return cached;

  const ringWidth = 3;
  const classAttr = extraClass ? ` ${extraClass}` : '';
  const safeUrl = escapeHtmlAttr(logoUrl);
  const html = `<div class="${classAttr.trim()}" style="width:${size}px;height:${size}px;border-radius:50%;border:${ringWidth}px solid ${ringColor};box-shadow:0 2px 6px rgba(0,0,0,0.28);overflow:hidden;background:#fff;box-sizing:border-box;"><img src="${safeUrl}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;border-radius:50%;display:block;" /></div>`;
  const icon = divIcon({
    html,
    className: `reports-viz-marker${extraClass ? ` ${extraClass}` : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  logoCircleIconCache.set(cacheKey, icon);
  return icon;
}

export function createClusterMarkerIcon(count: number): ReturnType<typeof divIcon> {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        style: {
          backgroundColor: CLUSTER_MARKER_BG,
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.32)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        },
      },
      createElement(Layers, { size: 14, color: 'white', strokeWidth: 2.5 }),
      createElement(
        'span',
        { style: { fontSize: 11, fontWeight: 700, lineHeight: 1 } },
        String(count)
      )
    )
  );
  const icon = divIcon({
    html,
    className: 'reports-viz-cluster-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  return icon;
}

function ReportMapMarkerIcon({
  marker,
  isSelected,
}: {
  marker: MapMarkerBase;
  isSelected?: boolean;
}) {
  const mt = String(marker.markerType ?? 'unknown');
  const ring = MARKER_COLORS[mt] ?? '#64748b';
  const ringWidth = mt === 'check-in' ? 4 : 3;
  const imgUrl = resolveMarkerImageUrl(marker);
  const name = String(marker.name ?? marker.id ?? mt);
  const initialsLabel =
    mt === 'check-in-visit'
      ? initialsSourceForVisitMarker(marker)
      : mt === 'lead'
        ? initialsSourceForLeadMarker(marker)
        : name;
  const isCheckIn = mt === 'check-in';

  const inner = imgUrl
    ? createElement('img', {
        src: imgUrl,
        alt: '',
        referrerPolicy: 'no-referrer',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '50%',
          display: 'block',
        },
      })
    : createElement(
        'div',
        {
          className: 'marker-pin-inner',
          style: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e2e8f0',
            color: '#475569',
            fontSize: mt === 'quotation' ? 13 : 11,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
          },
        },
        [
          'check-in',
          'shift-start',
          'shift-end',
          'break-start',
          'break-end',
          'claim',
          'check-in-visit',
          'lead',
        ].includes(mt)
          ? getInitials(initialsLabel)
          : genericPlaceholderChar(mt)
      );

  return createElement(
    'div',
    {
      className: [
        isSelected ? 'is-selected' : '',
        isCheckIn ? 'is-check-in-active' : '',
      ]
        .filter(Boolean)
        .join(' '),
      style: {
        width: MARKER_SIZE,
        height: MARKER_SIZE,
        borderRadius: '50%',
        border: `${ringWidth}px solid ${ring}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
        overflow: 'hidden',
        background: '#fff',
        boxSizing: 'border-box',
      },
    },
    inner
  );
}

export function getReportMarkerIcon(
  marker: MapMarkerBase,
  options?: { isSelected?: boolean }
): ReturnType<typeof divIcon> {
  const mt = String(marker.markerType ?? 'unknown');
  const selectedClass = options?.isSelected ? 'is-selected' : '';
  const checkInClass = mt === 'check-in' ? 'is-check-in-active' : '';
  const extraClass = [selectedClass, checkInClass].filter(Boolean).join(' ');

  if (mt === 'competitor') {
    const logoUrl = resolveCompetitorLogoUrl(marker);
    const resolvedBg = resolveCompetitorMarkerColor(marker);
    if (logoUrl) {
      return createLogoCircleMarkerIcon(
        logoUrl,
        resolvedBg,
        `competitor-logo:${marker.id}:${logoUrl}:${resolvedBg}:${extraClass}`,
        MAP_ENTITY_MARKER_SIZE,
        extraClass
      );
    }
    const { Icon } = MAP_ENTITY_MARKERS.competitor;
    return createLucideCircleMarkerIcon(
      resolvedBg,
      Icon,
      `competitor:${resolvedBg}:${extraClass}`,
      MAP_ENTITY_MARKER_SIZE,
      extraClass
    );
  }

  if (mt === 'client' || mt === 'branch' || mt === 'org') {
    const entityType = mt as MapEntityMarkerType;
    const { Icon, bg } = MAP_ENTITY_MARKERS[entityType];
    if (mt === 'branch' || mt === 'org') {
      const logoUrl = resolveBranchOrOrgLogoUrl(marker);
      if (logoUrl) {
        return createLogoCircleMarkerIcon(
          logoUrl,
          bg,
          `${entityType}-logo:${marker.id}:${logoUrl}:${bg}:${extraClass}`,
          MAP_ENTITY_MARKER_SIZE,
          extraClass
        );
      }
    }
    return createLucideCircleMarkerIcon(
      bg,
      Icon,
      `${entityType}:${bg}:${extraClass}`,
      MAP_ENTITY_MARKER_SIZE,
      extraClass
    );
  }

  const img = resolveMarkerImageUrl(marker) ?? '';
  const key = `${marker.id}-${mt}-${img}-${extraClass}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const html = renderToStaticMarkup(
    createElement(ReportMapMarkerIcon, { marker, isSelected: options?.isSelected })
  );
  const icon = divIcon({
    html,
    className: `reports-viz-marker${extraClass ? ` ${extraClass}` : ''}`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
  });
  iconCache.set(key, icon);
  return icon;
}

export function markerTooltipLabel(marker: MapMarkerBase): string {
  const name = String(marker.name ?? marker.id ?? 'Unknown');
  const mt = String(marker.markerType ?? '');
  return `${name} · ${mt}`;
}
