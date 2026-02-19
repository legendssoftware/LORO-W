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

export interface MapDataResponse {
  workers: MapMarkerBase[];
  clients: MapMarkerBase[];
  competitors: MapMarkerBase[];
  quotations: MapMarkerBase[];
  leads: MapMarkerBase[];
  shiftStarts: MapMarkerBase[];
  shiftEnds: MapMarkerBase[];
  checkIns: MapMarkerBase[];
  journals?: MapMarkerBase[];
  tasks?: MapMarkerBase[];
  claims?: MapMarkerBase[];
  allMarkers: MapMarkerBase[];
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
