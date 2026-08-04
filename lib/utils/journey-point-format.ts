import { formatDistanceToNow } from 'date-fns';

function displayOrDash(
  value: number | string | null | undefined,
  format?: (v: number | string) => string
): string {
  if (value == null) return '—';
  if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) {
    return '—';
  }
  if (typeof value === 'string' && !value.trim()) return '—';
  return format ? format(value as number | string) : String(value);
}

/** Device GPS speed is m/s; show km/h for the map popup. */
export function formatSpeedMps(mps: number | null | undefined): string {
  if (mps == null || !Number.isFinite(mps) || mps < 0) return '—';
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatHeading(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg) || deg < 0) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const i = Math.round(deg / 45) % 8;
  return `${dirs[i]} (${Math.round(deg)}°)`;
}

const BATTERY_STATE_LABELS: Record<number, string> = {
  0: 'Unknown',
  1: 'Unplugged',
  2: 'Charging',
  3: 'Full',
};

export function formatBattery(
  level: number | null | undefined,
  state: number | null | undefined
): string {
  const levelText = displayOrDash(level, (v) => `${Math.round(Number(v))}%`);
  if (state == null || state < 0) return levelText;
  const stateLabel = BATTERY_STATE_LABELS[state];
  if (!stateLabel || levelText === '—') {
    return stateLabel ? stateLabel : levelText;
  }
  return `${levelText} · ${stateLabel}`;
}

export function formatDevice(
  brand: string | null | undefined,
  modelName: string | null | undefined,
  manufacturer: string | null | undefined
): string {
  const parts = [brand, modelName].filter((p) => p?.trim());
  if (parts.length > 0) return parts.join(' ');
  if (manufacturer?.trim()) return manufacturer.trim();
  return '—';
}

export function formatOs(
  osName: string | null | undefined,
  osVersion: string | null | undefined
): string {
  const parts = [osName, osVersion].filter((p) => p?.trim());
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function formatNetwork(
  network: Record<string, unknown> | null | undefined
): string {
  if (!network || typeof network !== 'object') return '—';
  const state =
    network.state && typeof network.state === 'object'
      ? (network.state as Record<string, unknown>)
      : network;
  const type =
    (typeof state.type === 'string' && state.type) ||
    (typeof network.type === 'string' && network.type) ||
    null;
  if (!type) return '—';
  const connected =
    state.isConnected === true || network.isConnected === true
      ? 'connected'
      : state.isConnected === false || network.isConnected === false
        ? 'offline'
        : null;
  return connected ? `${type} · ${connected}` : type;
}

export function formatAccuracyMeters(
  accuracy: number | null | undefined
): string {
  return displayOrDash(accuracy, (v) => `${Number(v).toFixed(1)} m`);
}

/**
 * Initial bearing from point A → B in degrees (0–360), or null if coincident.
 */
export function bearingDegrees(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number | null {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return null;
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/** GPS recorded within this window is treated as "live" on the visualiser map. */
export const REP_GPS_LIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export type RepGpsFreshness = 'live' | 'stale' | 'unknown';

/** Classify rep GPS freshness for map layer list badges. */
export function classifyRepGpsFreshness(
  iso: string | null | undefined,
  nowMs: number = Date.now()
): RepGpsFreshness {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const ageMs = nowMs - d.getTime();
  if (ageMs < 0) return 'live';
  return ageMs <= REP_GPS_LIVE_THRESHOLD_MS ? 'live' : 'stale';
}

/** Relative “5 minutes ago” label for a recordedAt ISO string. */
export function formatRelativeRecordedAt(
  iso: string | null | undefined
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return null;
  }
}

export function formatAbsoluteRecordedAt(
  iso: string | null | undefined
): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Direction along a trail at `index`: prefer prev→next, else prev→current, else current→next.
 */
export function trailBearingAtIndex(
  points: Array<{ latitude: number; longitude: number }>,
  index: number
): number | null {
  if (points.length < 2 || index < 0 || index >= points.length) return null;
  const prev = index > 0 ? points[index - 1] : null;
  const curr = points[index];
  const next = index < points.length - 1 ? points[index + 1] : null;
  if (prev && next) return bearingDegrees(prev, next);
  if (prev) return bearingDegrees(prev, curr);
  if (next) return bearingDegrees(curr, next);
  return null;
}
