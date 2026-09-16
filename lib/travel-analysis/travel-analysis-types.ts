/** Staff travel analysis PDF — payload from GET /reports/travel-analysis and the rendered document. */

export type TravelAnalysisSummary = {
  user: string;
  vehicleLabel: string;
  fuelTypeLabel: string;
  ratedKmPerLitreLabel: string;
  branch: string;
  recordedDistanceKm: number;
  commuteDeductedKm: number;
  visits: number;
  petrolClaimCount: number;
  petrolClaimAmount: number;
  fuelLitresUsed: number;
  fuelPricePerLitre: string;
  country: string;
  region: string;
  stops: number;
  travelMin: number;
  stopMin: number;
  avgStopMin: number;
  distanceKm: number;
  fuelRefundAmount: number;
};

export type TravelAnalysisDailyRow = {
  user: string;
  date: string;
  recordedDistanceKm: number;
  commuteDeductedKm: number;
  travelMin: number;
  stopMin: number;
  startPlace: string;
  endPlace: string;
  country: string;
  region: string;
  fuelTypeLabel: string;
  ratedKmPerLitre: string;
  fuelPricePerLitre: string;
  fuelLitres: string;
  fuelRand: string;
  minBattery: string;
  avgBattery: string;
  distanceKm: number;
};

export type TravelAnalysisStopRow = {
  user: string;
  date: string;
  place: string;
  arrived: string;
  left: string;
  dwellMin: number;
  batteryIn: string;
  batteryOut: string;
  lat: string;
  lng: string;
};

export type TravelAnalysisPayload = {
  fromYmd: string;
  toYmd: string;
  timezone: string;
  generatedAtIso: string;
  organisationName: string;
  summary: TravelAnalysisSummary | null;
  daily: TravelAnalysisDailyRow[];
  stops: TravelAnalysisStopRow[];
  visitCount: number;
  movingSampleCount: number;
  stoppedSampleCount: number;
};

export type TravelAnalysisArea = {
  area: string;
  stops: number;
  dwellMin: number;
  dwellSharePct: number;
};

export type TravelAnalysisDayRow = {
  date: string;
  recordedKm: number;
  billableKm: number;
  travelLabel: string;
  stopLabel: string;
  start: string;
  end: string;
  region: string;
  fuelLitres: string;
  fuelRand: string;
};

export type TravelAnalysisFuelDay = {
  date: string;
  price: string;
  litres: string;
  zar: string;
};

export type TravelAnalysisDocument = {
  meta: {
    title: string;
    userName: string;
    organisationName: string;
    fromYmd: string;
    toYmd: string;
    generatedAtIso: string;
    timezone: string;
  };
  kpis: {
    billableKm: number;
    recordedKm: number;
    commuteDeductedKm: number;
    visits: number;
    stops: number;
    travelMin: number;
    stopMin: number;
    fuelLitres: number;
    fuelZar: number;
    claimsLabel: string;
    vehicle: string;
    fuelType: string;
    ratedKmPerLitre: string;
    country: string;
    region: string;
    branch: string;
  };
  vehicleBasis: {
    vehicle: string;
    fuelType: string;
    fuelGrade: string;
    ratedKmPerLitre: string;
    isFleetDefault: boolean;
    country: string;
    region: string;
  };
  days: TravelAnalysisDayRow[];
  areas: TravelAnalysisArea[];
  patterns: {
    travelMin: number;
    stopMin: number;
    travelSharePct: number;
    stopSharePct: number;
    daysWithMovement: number;
    avgKmPerTravelDay: number | null;
    avgStopsPerTravelDay: number | null;
    avgTravelMinPerTravelDay: number | null;
    dwellBrief: number;
    dwellWorking: number;
    dwellLong: number;
    typicalStart: string;
    typicalEnd: string;
    movingSampleCount: number;
    stoppedSampleCount: number;
  };
  fuelDays: TravelAnalysisFuelDay[];
  fuelTotals: {
    litres: number;
    zar: number;
    daysWithFuel: number;
  };
  disclaimer: string;
};

export const TRAVEL_ANALYSIS_DISCLAIMER =
  'Figures are estimates from GPS trails, check-ins, assigned vehicle consumption, and Fuel SA prices. They are not a claim settlement, payroll figure, or guaranteed refund. Fuel cost is calculated for South Africa travel only; days outside SA show billable km with fuel blank. Billable km subtracts 20 km home-to-office commute on days with travel.';
