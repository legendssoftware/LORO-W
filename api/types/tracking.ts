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

export type RepJourneyRange = 'hour' | 'today' | 'day' | 'week' | 'custom';

export interface RepJourneyCustomRangeParams {
  startDate: string;
  endDate: string;
}

export interface RepJourneyPoint {
  uid?: number;
  latitude: number;
  longitude: number;
  recordedAt: string;
  accuracy?: number | null;
  /** Device GPS speed in m/s. */
  speed?: number | null;
  address?: string | null;
  isStop?: boolean;
  stopDurationMinutes?: number | null;
  stopDurationFormatted?: string | null;
}

export interface RepJourneyPeriodAverages {
  averageSpeedKmh: number;
  averageDistanceKm: number;
  totalDistanceKm: number;
  totalPoints: number;
}

export interface RepJourneyProminentLocation {
  address: string;
  latitude: number;
  longitude: number;
  timeSpentMinutes: number;
  timeSpentFormatted: string;
  isCompetitorViolation?: boolean;
  competitorName?: string;
  matchedEntityType?: 'competitor' | 'client' | 'branch' | null;
}

export interface RepJourneyCompetitorViolation {
  competitorUid: number;
  competitorName: string;
  address: string;
  latitude: number;
  longitude: number;
  dwellMinutes: number;
  dwellFormatted: string;
  startTime: string;
  endTime: string;
  geofenceType: string;
}

/** First or last point of the tracked journey window. */
export interface RepJourneyEndpoint {
  address: string | null;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export interface RepJourneyFuelPrice {
  averagePetrolPerLitreZar: number | null;
  grade: string | null;
  region: string | null;
  asOf: string | null;
  source: 'fuel-sa' | null;
  province?: string | null;
  fuelZone?: 'Reef' | 'Coast' | null;
  refillBasis?: 'journey-start' | null;
}

export interface RepJourneyFuelEstimate {
  assumedKmPerLitre: number;
  estimatedLitres: number;
  estimatedCostZar: number;
}

export type RepJourneyVehicleProfileSource = 'user-vehicle' | 'fleet-default';

export interface RepJourneyVehicleProfile {
  assetUid: number | null;
  displayName: string | null;
  make: string | null;
  model: string | null;
  sizeClass: string | null;
  fuelType: string | null;
  ratedKmPerLitre: number;
  source: RepJourneyVehicleProfileSource;
}

export type RepJourneyPaceLabel =
  | 'below_budget'
  | 'on_pace'
  | 'above_budget'
  | 'unknown';

export interface RepJourneyConsumptionComparison {
  periodDistanceKm: number;
  ratedKmPerLitre: number;
  tripEstimatedLitres: number;
  tripEstimatedCostZar: number;
  monthlyFuelAllowanceZar: number | null;
  monthlyKmBudget: number | null;
  dailyKmBudget: number | null;
  budgetPacePercent: number | null;
  paceLabel: RepJourneyPaceLabel;
}

export interface RepJourneyDistanceAdjustment {
  workCommuteKmPerDay: number;
  calendarDaysInRange: number;
  workCommuteDeductionKm: number;
  recordedDistanceKm: number;
  billableDistanceKm: number;
}

export interface RepJourneySummary {
  totalPoints: number;
  totalDistanceKm: number;
  averageSpeedKmh: number;
  /** Moving duration between GPS points (excludes stop dwell). */
  totalTravelMinutes: number;
  totalTravelFormatted: string;
  totalStopMinutes: number;
  totalStopFormatted: string;
  stopCount?: number;
  averageStopMinutes?: number;
  averageStopFormatted?: string;
  /** Wall-clock span from first to last GPS point in the window. */
  totalDurationMinutes?: number;
  totalDurationFormatted?: string;
  startPlace: RepJourneyEndpoint | null;
  endPlace: RepJourneyEndpoint | null;
  prominentLocations: RepJourneyProminentLocation[];
  competitorViolations?: RepJourneyCompetitorViolation[];
  fuelPrice: RepJourneyFuelPrice;
  fuelEstimate?: RepJourneyFuelEstimate | null;
  vehicleProfile?: RepJourneyVehicleProfile | null;
  consumptionComparison?: RepJourneyConsumptionComparison | null;
  distanceAdjustment?: RepJourneyDistanceAdjustment | null;
  periodAverages: {
    day: RepJourneyPeriodAverages;
    week: RepJourneyPeriodAverages;
    month: RepJourneyPeriodAverages;
  };
}

export interface RepJourneyData {
  userId: number;
  range: RepJourneyRange;
  period: { start: string; end: string };
  totalPoints: number;
  points: RepJourneyPoint[];
  /** Road-snapped polyline for map rendering — [longitude, latitude][]. */
  routeCoordinates?: [number, number][];
  /** Independent polylines per continuous GPS cluster — preferred for map rendering. */
  routeSegments?: [number, number][][];
  routeGeometrySource?: 'roads' | 'raw-gps' | 'none';
  summary: RepJourneySummary;
}

export interface RepJourneyResponse {
  message: string;
  data: RepJourneyData | null;
}
