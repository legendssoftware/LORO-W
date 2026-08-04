export type LastKnownLocationSummary = {
  address: string | null;
  recordedAt: string | null;
  batteryLabel?: string | null;
  deviceLabel?: string | null;
  latitude: number;
  longitude: number;
};
