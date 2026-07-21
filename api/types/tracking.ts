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
  address?: string | null;
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
