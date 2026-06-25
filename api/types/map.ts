/**
 * Map report types for GET `/reports/map`.
 * `allMarkers` includes `client`, `competitor`, `branch`, and optional `org` HQ.
 * Clients/competitors are loaded by Clerk `organisationUid` string — not by branch.
 * Legacy activity arrays remain empty for API compatibility.
 */

export interface MapConfigType {
  defaultCenter: { lat: number; lng: number };
  orgRegions: Array<{
    name: string;
    center: { lat: number; lng: number };
    zoom: number;
  }>;
}

export interface MapMarkerBase {
  id: string | number;
  name: string;
  position: [number, number];
  latitude: number;
  longitude: number;
  markerType: string;
  /** Resolved hardware retail brand for competitor markers (e.g. BUCO, CASHBUILD). */
  hardwareBrand?: string;
  /** Hex marker background color from API (competitor brand styling). */
  markerColor?: string;
  accountName?: string;
  LegalEntity?: string;
  [key: string]: unknown;
}

export interface GeofenceMapDefaults {
  defaultRadiusMeters: number;
  minRadiusMeters: number;
  maxRadiusMeters: number;
}

/** Influence sphere; API currently returns `client` and `competitor` zones only. Legacy kinds remain for typing. */
export type InfluenceCircleKind =
  | 'organisation'
  | 'organization'
  | 'org'
  | 'client'
  | 'competitor'
  | 'branch'
  | 'lead'
  | 'check-in'
  | 'check-in-visit'
  | 'shift-start'
  | 'shift-end'
  | 'break-start'
  | 'break-end'
  | 'quotation'
  | 'task'
  | 'journal'
  | 'claim';

export interface InfluenceCircle {
  id: string;
  /** Primary category for UI color (same as markerType for action circles). */
  kind: InfluenceCircleKind | string;
  /** Optional duplicate of kind for clients that prefer markerType. */
  markerType?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  /** Brand-aligned hex color for competitor influence circles. */
  markerColor?: string;
  hardwareBrand?: string;
}

export interface MapOrganisationSummary {
  uid: number;
  /** Clerk organisation id — clients/competitors are filtered by this string on the server. */
  organisationUid?: string;
  name: string;
  status: string;
  logo: string | null;
  timezone: string;
}

export interface MapLayers {
  branches: MapMarkerBase[];
  competitors: MapMarkerBase[];
  clients: MapMarkerBase[];
  org?: MapMarkerBase[];
  /** Mirrors top-level arrays; `checkIns`/shift/worker marker slots stay empty — check-in-related pins are omitted from maps. */
  activity: {
    leads: MapMarkerBase[];
    checkIns: MapMarkerBase[];
    shiftStarts: MapMarkerBase[];
    shiftEnds: MapMarkerBase[];
    breakStarts: MapMarkerBase[];
    breakEnds: MapMarkerBase[];
    journals: MapMarkerBase[];
    tasks: MapMarkerBase[];
    quotations: MapMarkerBase[];
    claims: MapMarkerBase[];
    workers: MapMarkerBase[];
  };
}

export interface MapDataResponse {
  organisation?: MapOrganisationSummary;
  layers?: MapLayers;
  workers: MapMarkerBase[];
  clients: MapMarkerBase[];
  competitors: MapMarkerBase[];
  quotations: MapMarkerBase[];
  leads: MapMarkerBase[];
  shiftStarts: MapMarkerBase[];
  shiftEnds: MapMarkerBase[];
  breakStarts?: MapMarkerBase[];
  breakEnds?: MapMarkerBase[];
  checkIns: MapMarkerBase[];
  journals?: MapMarkerBase[];
  tasks?: MapMarkerBase[];
  claims?: MapMarkerBase[];
  branches?: MapMarkerBase[];
  allMarkers: MapMarkerBase[];
  geofenceMapDefaults?: GeofenceMapDefaults;
  influenceCircles?: InfluenceCircle[];
  mapDateRange?: {
    start: string;
    end: string;
    timezone?: string;
    startCalendarYmd?: string;
    endCalendarYmd?: string;
  };
  events: Array<{
    id: string | number;
    type: string;
    title?: string;
    time?: string;
    timestamp?: string;
    user?: string;
    userName?: string;
    location?: { lat: number; lng: number; address?: string };
    details?: string;
  }>;
  mapConfig: MapConfigType;
  /** Forward-geocoding stats when clients/competitors/branches lacked stored coordinates. */
  geocodingSummary?: {
    clients: {
      total: number;
      alreadyHadCoords: number;
      alreadyExhausted?: number;
      resolvedViaGps: number;
      resolvedViaGeocode: number;
      skippedUngeocodable?: number;
      failed: number;
      cappedPending: number;
    };
    competitors: {
      total: number;
      alreadyHadCoords: number;
      alreadyExhausted?: number;
      resolvedViaGps: number;
      resolvedViaGeocode: number;
      skippedUngeocodable?: number;
      failed: number;
      cappedPending: number;
    };
    branches: {
      total: number;
      alreadyHadCoords: number;
      alreadyExhausted?: number;
      resolvedViaGps: number;
      resolvedViaGeocode: number;
      skippedUngeocodable?: number;
      failed: number;
      cappedPending: number;
    };
  };
  analytics?: {
    totalMarkers: number;
    markerBreakdown?: Record<string, MapMarkerBase[]>;
  };
}
