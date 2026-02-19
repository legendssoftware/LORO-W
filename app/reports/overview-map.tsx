'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import {
  Building2,
  MapPin,
  Clock,
  Play,
  Handshake,
  Footprints,
  FileCheck,
  ClipboardList,
  DollarSign,
  Coffee,
  type LucideIcon,
} from 'lucide-react';
import { useMapReport, useBranches, useUsers } from '@/api/hooks';
import type { MapMarkerBase, MapDataResponse } from '@/api/types/map';
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
import { cn } from '@/lib/utils';

import 'leaflet/dist/leaflet.css';

const DEFAULT_ZOOM = 10;
const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473]; // Johannesburg fallback

const MARKER_TYPE_CONFIG: Record<
  string,
  { color: string; label: string; icon: LucideIcon }
> = {
  'check-in': { color: '#2563eb', label: 'Attendance (current)', icon: Clock },
  'shift-start': { color: '#16a34a', label: 'Shift start', icon: Play },
  'shift-end': { color: '#dc2626', label: 'Shift end', icon: Play },
  lead: { color: '#16a34a', label: 'Lead', icon: Handshake },
  client: { color: '#7c3aed', label: 'Client', icon: Building2 },
  competitor: { color: '#dc2626', label: 'Competitor', icon: Building2 },
  'check-in-visit': { color: '#4f46e5', label: 'Visit', icon: Footprints },
  quotation: { color: '#d97706', label: 'Quotation', icon: FileCheck },
  journal: { color: '#64748b', label: 'Journal', icon: ClipboardList },
  task: { color: '#0891b2', label: 'Task', icon: ClipboardList },
  claim: { color: '#e11d48', label: 'Claim', icon: DollarSign },
  'break-start': { color: '#65a30d', label: 'Break start', icon: Coffee },
  'break-end': { color: '#ca8a04', label: 'Break end', icon: Coffee },
};

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
  { value: 'lead', label: 'Leads only' },
  { value: 'shift-start', label: 'Shift starts' },
  { value: 'shift-end', label: 'Shift ends' },
  { value: 'client', label: 'Clients' },
  { value: 'check-in-visit', label: 'Visits' },
  { value: 'attendance', label: 'Attendance' },
] as const;

function filterMarkersByType(
  markers: MapMarkerBase[],
  typeFilter: string
): MapMarkerBase[] {
  if (!typeFilter || typeFilter === 'all') return markers;
  if (typeFilter === 'attendance') {
    return markers.filter((m) =>
      ['check-in', 'shift-start', 'shift-end'].includes(m.markerType)
    );
  }
  return markers.filter((m) => m.markerType === typeFilter);
}

function MarkerDetailContent({ marker }: { marker: MapMarkerBase }) {
  const addr =
    (marker.location as { address?: string } | undefined)?.address ??
    marker.address ??
    (marker as { location?: { address?: string } }).location?.address;
  const typeConfig = getMarkerConfig(marker.markerType);
  const Icon = typeConfig.icon;

  return (
    <div className="min-w-[200px] max-w-[320px] space-y-2 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span>{marker.name}</span>
      </p>
      {marker.status != null && (
        <p className="text-muted-foreground">
          <span className="font-medium">Status:</span> {String(marker.status)}
        </p>
      )}
      {addr && (
        <p className="text-muted-foreground">
          <span className="font-medium">Address:</span> {addr}
        </p>
      )}
      {(marker as { timestamp?: string }).timestamp && (
        <p className="text-muted-foreground">
          <span className="font-medium">Time:</span>{' '}
          {new Date((marker as { timestamp: string }).timestamp).toLocaleString()}
        </p>
      )}
      {(marker as { owner?: { name?: string } }).owner?.name && (
        <p className="text-muted-foreground">
          <span className="font-medium">By:</span>{' '}
          {(marker as { owner: { name: string } }).owner.name}
        </p>
      )}
    </div>
  );
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

/** Build a single list of markers from response; prefer allMarkers, fallback to combined arrays. */
function getAllMarkers(data: MapDataResponse): MapMarkerBase[] {
  if (data.allMarkers?.length) return data.allMarkers;
  const parts: MapMarkerBase[] = [
    ...(data.workers ?? []),
    ...(data.shiftStarts ?? []),
    ...(data.shiftEnds ?? []),
    ...(data.leads ?? []),
    ...(data.clients ?? []),
    ...(data.checkIns ?? []),
    ...(data.competitors ?? []),
    ...(data.quotations ?? []),
    ...(data.journals ?? []),
    ...(data.tasks ?? []),
    ...(data.claims ?? []),
  ];
  return parts;
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
  const center: [number, number] = useMemo(() => {
    const c = data.mapConfig?.defaultCenter;
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
      return [c.lat, c.lng];
    }
    return DEFAULT_CENTER;
  }, [data.mapConfig]);

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
        const config = getMarkerConfig(marker.markerType);
        return (
          <CircleMarker
            key={String(marker.id)}
            center={pos as [number, number]}
            pathOptions={{
              fillColor: config.color,
              color: config.color,
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }}
            radius={8}
          >
            <Popup>
              <MarkerDetailContent marker={marker} />
            </Popup>
          </CircleMarker>
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
                  {b.name ?? `Branch ${b.uid}`}
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
