import type { MapMarkerBase } from '@/api/types/map';
import type { VisitExportItem } from '@/api/types/reports';
import { formatAddressForDisplay, isCoordLike } from '@/components/visits-table/visits-table-utils';

/**
 * Parses "lat,lng" from visit location strings (GPS capture). Returns null for addresses or invalid values.
 */
export function parseLatLngFromVisitLocation(
  raw: string | null | undefined
): { lat: number; lng: number } | null {
  if (raw == null || raw === '' || raw === '-') return null;
  const s = String(raw).trim();
  const parts = s.split(',').map((p) => p.trim());
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function ownerDisplayName(v: VisitExportItem): string {
  const o = v.owner;
  if (!o) return 'Unknown';
  const n = [o.name, (o as { surname?: string }).surname].filter(Boolean).join(' ').trim();
  return n || o.email || `User ${(o as { uid?: number }).uid ?? ''}`;
}

/** Prefer structured address; never show raw lat,lng in UI — use a short GPS label when only coordinates exist. */
export function visitLocationDisplayLine(
  structured: VisitExportItem['fullAddress'] | VisitExportItem['checkOutFullAddress'] | undefined,
  raw: string | null | undefined
): string {
  const structuredStr = structured
    ? formatAddressForDisplay(structured, '')
    : '';
  if (structuredStr && structuredStr.trim() !== '' && structuredStr !== '-') {
    return structuredStr.trim();
  }
  const rawStr = (raw ?? '').trim();
  if (!rawStr || rawStr === '-') return '—';
  if (isCoordLike(rawStr)) return 'GPS position (pin on map)';
  return rawStr;
}

/**
 * Map markers for the reports visualiser: GPS check-in only, aligned with filtered visit rows.
 */
export function visitExportItemsToMapMarkers(visits: VisitExportItem[]): MapMarkerBase[] {
  const out: MapMarkerBase[] = [];
  for (const v of visits) {
    const coords = parseLatLngFromVisitLocation(v.checkInLocation);
    if (!coords) continue;

    const o = v.owner;
    const ownerForMarker = o
      ? {
          uid: (o as { uid?: number }).uid,
          name: o.name,
          surname: (o as { surname?: string }).surname,
          email: o.email,
          photoURL: o.photoURL,
          avatar: o.avatar,
        }
      : null;

    const checkInAddressDisplay = visitLocationDisplayLine(v.fullAddress, v.checkInLocation);
    const checkOutAddressDisplay = visitLocationDisplayLine(
      v.checkOutFullAddress ?? undefined,
      v.checkOutLocation
    );

    const marker: MapMarkerBase = {
      id: `visit-checkin-${v.uid}`,
      name: `Visit — ${ownerDisplayName(v)}`,
      position: [coords.lat, coords.lng],
      latitude: coords.lat,
      longitude: coords.lng,
      markerType: 'check-in-visit',
      status: v.checkOutTime ? 'Completed' : 'In Progress',
      timestamp: v.checkInTime,
      location: {
        address: checkInAddressDisplay,
        imageUrl: v.checkInPhoto ?? undefined,
      },
      checkInData: {
        uid: v.uid,
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
        duration: v.duration,
        checkInPhoto: v.checkInPhoto,
        checkOutPhoto: v.checkOutPhoto,
        checkInLocation: v.checkInLocation,
        checkOutLocation: v.checkOutLocation,
        checkInAddressDisplay,
        checkOutAddressDisplay,
        branch: v.branch
          ? {
              uid: v.branch.uid,
              name: v.branch.name,
            }
          : null,
      },
      owner: ownerForMarker,
      client: v.client
        ? {
            uid: v.client.uid,
            name: v.client.name,
          }
        : null,
      image: o?.photoURL ?? o?.avatar ?? undefined,
    };
    out.push(marker);
  }
  return out;
}
