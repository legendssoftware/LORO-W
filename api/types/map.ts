/**
 * Map report types for GET /reports/map. Leaflet-ready: markers have position [lat, lng], markerType.
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
  [key: string]: unknown;
}

export interface GeofenceMapDefaults {
  defaultRadiusMeters: number;
  minRadiusMeters: number;
  maxRadiusMeters: number;
}

/** Influence sphere on the map; kind matches marker types for styling (incl. branch + action markers). */
export type InfluenceCircleKind =
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
}

export interface MapDataResponse {
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
  mapDateRange?: { start: string; end: string };
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
  analytics?: {
    totalMarkers: number;
    markerBreakdown?: Record<string, MapMarkerBase[]>;
  };
}
