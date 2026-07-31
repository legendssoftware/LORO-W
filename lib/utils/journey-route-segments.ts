import type { RepJourneyPoint } from '@/api/types/tracking';

export type JourneyRouteGeometry = {
  routeSegments?: [number, number][][];
  routeCoordinates?: [number, number][];
  points?: RepJourneyPoint[];
};

/** Distinct polyline colours when multiple reps are traced at once. */
export const REP_ROUTE_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
] as const;

export function repRouteColor(index: number): string {
  return REP_ROUTE_COLORS[index % REP_ROUTE_COLORS.length];
}

/**
 * Resolve drawable route segments for map polylines.
 * Uses API road geometry only — journey key points (stops) are for markers, not lines.
 */
export function resolveJourneySegments(
  route: JourneyRouteGeometry | null | undefined
): [number, number][][] {
  if (!route) return [];

  const segs = route.routeSegments?.filter((s) => s.length >= 2);
  if (segs?.length) return segs;

  const flat = route.routeCoordinates?.filter(
    (c) =>
      Array.isArray(c) &&
      c.length === 2 &&
      Number.isFinite(c[0]) &&
      Number.isFinite(c[1])
  );
  if (flat && flat.length >= 2) return [flat];

  return [];
}
