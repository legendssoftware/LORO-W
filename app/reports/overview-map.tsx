'use client';

import { useMemo, useState, useCallback, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import { divIcon } from 'leaflet';
import {
  Building2,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { useMapReport, useBranches, useUsers, getBranchDisplayLabel } from '@/api/hooks';
import type { MapMarkerBase, MapDataResponse } from '@/api/types/map';
import { excludeCheckInRelatedMapMarkers } from '@/app/reports/utils/filter-map-markers-no-checkins';
import { MapMarkerDetailPopup } from '@/app/reports/components/map-marker-detail-popup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2Icon } from '@/lib/icons';
import {
  isLocalMapPinAsset,
  resolveMapPinUrl,
} from '@/lib/utils/resolve-competitor-logo-url';
import {
  MAP_PIN_HEIGHT,
  MAP_PIN_WIDTH,
} from '@/lib/leaflet/map-pin-constants';

import 'leaflet/dist/leaflet.css';

/* Override Leaflet divIcon so our filled circle + icon show correctly */
const customMarkerStyles = `
  .custom-marker-icon.leaflet-div-icon {
    border: none !important;
    background: transparent !important;
  }
`;

const DEFAULT_ZOOM = 10;
const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473]; // Johannesburg fallback

const MARKER_TYPE_CONFIG: Record<
  string,
  { color: string; label: string; icon: LucideIcon }
> = {
  client: { color: '#7c3aed', label: 'Client', icon: Building2 },
  competitor: { color: '#dc2626', label: 'Competitor', icon: Building2 },
};

const MARKER_ICON_SIZE = 24;
const iconCache = new Map<string, ReturnType<typeof divIcon>>();

function createMarkerIcon(marker: MapMarkerBase): ReturnType<typeof divIcon> {
  const markerType = marker.markerType;
  const mapPinUrl = resolveMapPinUrl(marker);
  const cacheKey = mapPinUrl
    ? `${markerType}:${marker.id}:${mapPinUrl}`
    : markerType;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const config = getMarkerConfig(markerType);

  if (mapPinUrl && isLocalMapPinAsset(mapPinUrl)) {
    const html = renderToStaticMarkup(
      createElement('img', {
        src: mapPinUrl,
        alt: '',
        style: {
          width: MAP_PIN_WIDTH,
          height: MAP_PIN_HEIGHT,
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.28))',
        },
      })
    );
    const icon = divIcon({
      html,
      className: 'custom-marker-icon map-pin-marker',
      iconSize: [MAP_PIN_WIDTH, MAP_PIN_HEIGHT],
      iconAnchor: [MAP_PIN_WIDTH / 2, MAP_PIN_HEIGHT],
    });
    iconCache.set(cacheKey, icon);
    return icon;
  }

  const size = MARKER_ICON_SIZE;

  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        className: 'marker-circle',
        style: {
          backgroundColor: config.color,
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      createElement(config.icon, {
        size: 14,
        color: 'white',
        strokeWidth: 2.5,
      })
    )
  );

  const icon = divIcon({
    html,
    className: 'custom-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

function getMarkerConfig(markerType: string) {
  return (
    MARKER_TYPE_CONFIG[markerType] ?? {
      color: '#6b7280',
      label: markerType || 'Other',
      icon: MapPin,
    }
  );
}

export const MAP_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Clients only' },
  { value: 'competitor', label: 'Competitors only' },
] as const;

function filterMarkersByType(
  markers: MapMarkerBase[],
  typeFilter: string
): MapMarkerBase[] {
  if (!typeFilter || typeFilter === 'all') return markers;
  return markers.filter((m) => m.markerType === typeFilter);
}

function MarkerDetailContent({ marker }: { marker: MapMarkerBase }) {
  return <MapMarkerDetailPopup marker={marker} />;
}

function LocationButton() {
  const map = useMap();

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], map.getZoom());
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [map]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="absolute bottom-4 left-4 z-[1000] bg-background shadow"
      onClick={handleLocate}
    >
      Use my location
    </Button>
  );
}

/** Prefer `allMarkers`; fallback stitches layers (visit check-in layer is always empty on the server). */
function getAllMarkers(data: MapDataResponse): MapMarkerBase[] {
  const raw = data.allMarkers?.length
    ? data.allMarkers
    : [...(data.clients ?? []), ...(data.competitors ?? []), ...(data.checkIns ?? [])];
  return excludeCheckInRelatedMapMarkers(raw);
}

function MapContent({
  data,
  typeFilter,
}: {
  data: MapDataResponse;
  typeFilter: string;
}) {
  const markers = useMemo(() => {
    const all = getAllMarkers(data);
    return filterMarkersByType(all, typeFilter);
  }, [data, typeFilter]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => {
        const pos = marker.position ?? [marker.latitude, marker.longitude];
        if (
          !Array.isArray(pos) ||
          pos.length < 2 ||
          typeof pos[0] !== 'number' ||
          typeof pos[1] !== 'number'
        ) {
          return null;
        }
        return (
          <Marker
            key={String(marker.id)}
            position={pos as [number, number]}
            icon={createMarkerIcon(marker)}
          >
            <Popup>
              <MarkerDetailContent marker={marker} />
            </Popup>
          </Marker>
        );
      })}
      <LocationButton />
    </>
  );
}

function OverviewMapInner() {
  const [branchId, setBranchId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const params = useMemo(() => {
    const p: { branchId?: number; userId?: number } = {};
    if (branchId) {
      const n = parseInt(branchId, 10);
      if (!Number.isNaN(n)) p.branchId = n;
    }
    if (userId) {
      const n = parseInt(userId, 10);
      if (!Number.isNaN(n)) p.userId = n;
    }
    return p;
  }, [branchId, userId]);

  const { data, isLoading, isError, refetch } = useMapReport(params, {
    enabled: true,
  });
  const { data: branches = [] } = useBranches({ enabled: true });
  const { data: users = [] } = useUsers({ enabled: true });

  const center: [number, number] = useMemo(() => {
    const c = data?.mapConfig?.defaultCenter;
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
      return [c.lat, c.lng];
    }
    return DEFAULT_CENTER;
  }, [data?.mapConfig]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[360px] items-center justify-center rounded-md border bg-muted/30">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[360px] flex-col items-center justify-center gap-3 rounded-md border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Failed to load map data. Please try again.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: customMarkerStyles }} />
      <CardHeader className="relative z-[9999] pb-2">
        <CardTitle>Overview</CardTitle>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[160px] bg-background">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.uid} value={String(b.uid)}>
                  {getBranchDisplayLabel(b) || `Branch ${b.uid}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={userId || 'all'}
            onValueChange={(v) => setUserId(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[160px] bg-background">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => (
                <SelectItem
                  key={u.uid}
                  value={String(u.uid)}
                >{`${[u.name, u.surname].filter(Boolean).join(' ')}`.trim() || `User ${u.uid}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[160px] bg-background">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {MAP_TYPE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[360px] w-full overflow-hidden rounded-b-lg">
          <MapContainer
            center={center}
            zoom={DEFAULT_ZOOM}
            className="h-full w-full rounded-b-lg"
            scrollWheelZoom
          >
            <MapContent data={data} typeFilter={typeFilter} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewMap() {
  return <OverviewMapInner />;
}
