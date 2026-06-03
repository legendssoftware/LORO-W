'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { OptimizedRoute } from '@/api/types/tasks';
import 'leaflet/dist/leaflet.css';

const STOP_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];

function FitBounds({ routes }: { routes: OptimizedRoute[] }) {
  const map = useMap();
  const points = useMemo(() => {
    const pts: [number, number][] = [];
    for (const r of routes) {
      for (const s of r.stops) {
        if (s.location.latitude && s.location.longitude) {
          pts.push([s.location.latitude, s.location.longitude]);
        }
      }
    }
    return pts;
  }, [routes]);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);

  return null;
}

function stopIcon(order: number, color: string) {
  return L.divIcon({
    className: 'planning-route-stop-icon',
    html: `<div style="background:${color};color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)">${order}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

interface PlanningRoutesMapInnerProps {
  routes: OptimizedRoute[];
  onStopClick?: (taskId: number) => void;
}

export function PlanningRoutesMapInner({
  routes,
  onStopClick,
}: PlanningRoutesMapInnerProps) {
  const center = useMemo((): [number, number] => {
    const first = routes[0]?.stops[0];
    if (first?.location.latitude && first.location.longitude) {
      return [first.location.latitude, first.location.longitude];
    }
    return [-26.2041, 28.0473];
  }, [routes]);

  return (
    <div className="h-[420px] overflow-hidden rounded-lg border">
      <MapContainer
        center={center}
        zoom={10}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds routes={routes} />
        {routes.map((route, routeIdx) => {
          const color = STOP_COLORS[routeIdx % STOP_COLORS.length];
          const positions = route.stops
            .filter((s) => s.location.latitude && s.location.longitude)
            .map((s) => [s.location.latitude, s.location.longitude] as [number, number]);
          return (
            <span key={route.userId}>
              {positions.length > 1 && (
                <Polyline positions={positions} color={color} weight={4} opacity={0.7} />
              )}
              {route.stops.map((stop, idx) => {
                if (!stop.location.latitude || !stop.location.longitude) return null;
                return (
                  <Marker
                    key={`${route.userId}-${stop.taskId}-${idx}`}
                    position={[stop.location.latitude, stop.location.longitude]}
                    icon={stopIcon(idx + 1, color)}
                    eventHandlers={
                      onStopClick
                        ? { click: () => onStopClick(stop.taskId) }
                        : undefined
                    }
                  >
                    <Popup>
                      <span className="text-xs">
                        Stop {idx + 1} · Task {stop.taskId}
                      </span>
                    </Popup>
                  </Marker>
                );
              })}
            </span>
          );
        })}
      </MapContainer>
    </div>
  );
}
