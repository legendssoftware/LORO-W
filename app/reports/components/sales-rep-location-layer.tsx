'use client';

import { Fragment } from 'react';
import { Marker, Popup, Tooltip, Circle } from 'react-leaflet';
import { formatDistanceToNow } from 'date-fns';
import type { LatestRepLocation } from '@/api/types/tracking';
import { createSalesRepLocationIcon } from '@/lib/leaflet/marker-icons';

export interface SalesRepLocationLayerProps {
  locations: LatestRepLocation[];
}

function repDisplayName(loc: LatestRepLocation): string {
  return [loc.user.name, loc.user.surname].filter(Boolean).join(' ').trim() || loc.user.email;
}

function formatLastSeen(recordedAt: string): string {
  try {
    return formatDistanceToNow(new Date(recordedAt), { addSuffix: true });
  } catch {
    return recordedAt;
  }
}

export function SalesRepLocationLayer({ locations }: SalesRepLocationLayerProps) {
  if (locations.length === 0) return null;

  return (
    <>
      {locations.map((loc) => {
        const position: [number, number] = [loc.latitude, loc.longitude];
        const name = repDisplayName(loc);
        const accuracy =
          loc.accuracy != null && loc.accuracy > 0 ? loc.accuracy : null;

        return (
          <Fragment key={`sales-rep-${loc.user.uid}`}>
            {accuracy != null ? (
              <Circle
                center={position}
                radius={accuracy}
                pathOptions={{
                  color: '#0284c7',
                  fillColor: '#0284c7',
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '4 4',
                }}
              />
            ) : null}
            <Marker
              position={position}
              icon={createSalesRepLocationIcon({
                uid: loc.user.uid,
                name: loc.user.name,
                surname: loc.user.surname,
                photoURL: loc.user.photoURL,
                avatar: loc.user.avatar,
              })}
              zIndexOffset={1200}
            >
              <Tooltip
                direction="top"
                offset={[0, -18]}
                className="reports-viz-tooltip"
                opacity={1}
              >
                {name} · Last mobile GPS {formatLastSeen(loc.recordedAt)}
              </Tooltip>
              <Popup className="reports-viz-popup" maxWidth={280}>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    Last mobile GPS from LORO app · {formatLastSeen(loc.recordedAt)}
                  </p>
                  {loc.address ? (
                    <p className="text-xs text-foreground">{loc.address}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </p>
                  )}
                  {accuracy != null ? (
                    <p className="text-xs text-muted-foreground">
                      Accuracy ±{Math.round(accuracy)} m
                    </p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}
