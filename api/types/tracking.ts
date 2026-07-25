export interface LatestRepLocationUser {
  uid: number;
  name: string;
  surname: string;
  email: string;
  photoURL?: string | null;
  avatar?: string | null;
}

export interface LatestRepLocation {
  user: LatestRepLocationUser;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  address?: string | null;
  heading?: number | null;
  /** Speed in meters per second (device GPS). */
  speed?: number | null;
  batteryLevel?: number | null;
  batteryState?: number | null;
  brand?: string | null;
  manufacturer?: string | null;
  modelID?: string | null;
  modelName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  network?: Record<string, unknown> | null;
  notes?: string | null;
  timestamp?: number | null;
  recordedAt: string;
}

export interface LatestRepLocationsData {
  locations: LatestRepLocation[];
  maxAgeHours: number;
  asOf: string;
}

export interface LatestRepLocationsResponse {
  message: string;
  data: LatestRepLocationsData | null;
}

export type RepJourneyRange = 'hour' | 'day' | 'week';

export interface RepJourneyPoint {
  latitude: number;
  longitude: number;
  recordedAt: string;
  accuracy?: number | null;
  speed?: number | null;
}

export interface RepJourneyData {
  userId: number;
  range: RepJourneyRange;
  period: { start: string; end: string };
  totalPoints: number;
  points: RepJourneyPoint[];
}

export interface RepJourneyResponse {
  message: string;
  data: RepJourneyData | null;
}
