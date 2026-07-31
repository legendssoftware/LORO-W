import {
  resolveJourneySegments,
  type JourneyRouteGeometry,
} from '@/lib/utils/journey-route-segments';

export type VisualiserPolylineDebugRoute = JourneyRouteGeometry & {
  repUid: number;
  repName: string;
  range: string;
  rangeLabel: string;
  routeGeometrySource: 'roads' | 'raw-gps' | 'none';
  period: { start: string; end: string };
  summary: {
    totalPoints: number;
    totalDistanceKm: number;
    totalTravelFormatted: string;
    startPlace: { address: string | null; recordedAt: string } | null;
    endPlace: { address: string | null; recordedAt: string } | null;
  };
  keyPointsCount: number;
  stopKeyPointsCount: number;
};

export type VisualiserPolylineDebugPayload = {
  tracedAt: string;
  routeCount: number;
  routes: Array<{
    repUid: number;
    repName: string;
    range: string;
    rangeLabel: string;
    period: { start: string; end: string };
    routeGeometrySource: string;
    api: {
      routeSegmentsCount: number;
      routeSegmentLengths: number[];
      routeCoordinatesCount: number;
    };
    keyPoints: {
      total: number;
      stops: number;
      movement: number;
    };
    resolvedForMap: {
      segmentCount: number;
      segmentLengths: number[];
      totalCoordinates: number;
      firstCoordinate: [number, number] | null;
      lastCoordinate: [number, number] | null;
    };
    summary: VisualiserPolylineDebugRoute['summary'];
    /** Paste this block back into Cursor after testing. */
    cursorFeedback: string;
  }>;
};

const LOG_PREFIX = '[visualiser:polyline]';

function buildCursorFeedback(
  route: VisualiserPolylineDebugPayload['routes'][number]
): string {
  return [
    `Rep: ${route.repName} (uid=${route.repUid})`,
    `Range: ${route.rangeLabel} (${route.range})`,
    `Geometry: ${route.routeGeometrySource}`,
    `API segments: ${route.api.routeSegmentsCount} [${route.api.routeSegmentLengths.join(', ')}]`,
    `Resolved map segments: ${route.resolvedForMap.segmentCount} [${route.resolvedForMap.segmentLengths.join(', ')}]`,
    `Coords plotted: ${route.resolvedForMap.totalCoordinates}`,
    `Key points (markers only): ${route.keyPoints.total} (${route.keyPoints.stops} stops)`,
    `Trip: ${route.summary.totalDistanceKm.toFixed(1)} km · ${route.summary.totalTravelFormatted}`,
    `Start: ${route.summary.startPlace?.address ?? '—'} @ ${route.summary.startPlace?.recordedAt ?? '—'}`,
    `End: ${route.summary.endPlace?.address ?? '—'} @ ${route.summary.endPlace?.recordedAt ?? '—'}`,
  ].join('\n');
}

/**
 * Logs polyline preparation to the browser console for Cursor feedback loops.
 * Also assigns `window.__VISUALISER_POLYLINE_DEBUG__` for copy/paste in DevTools.
 */
export function logVisualiserPolylineDebug(
  routes: VisualiserPolylineDebugRoute[]
): void {
  if (routes.length === 0) return;

  const payload: VisualiserPolylineDebugPayload = {
    tracedAt: new Date().toISOString(),
    routeCount: routes.length,
    routes: routes.map((route) => {
      const resolved = resolveJourneySegments(route);
      const flat = resolved.flat();

      const entry = {
        repUid: route.repUid,
        repName: route.repName,
        range: route.range,
        rangeLabel: route.rangeLabel,
        period: route.period,
        routeGeometrySource: route.routeGeometrySource,
        api: {
          routeSegmentsCount: route.routeSegments?.length ?? 0,
          routeSegmentLengths:
            route.routeSegments?.map((s) => s.length) ?? [],
          routeCoordinatesCount: route.routeCoordinates?.length ?? 0,
        },
        keyPoints: {
          total: route.keyPointsCount,
          stops: route.stopKeyPointsCount,
          movement: route.keyPointsCount - route.stopKeyPointsCount,
        },
        resolvedForMap: {
          segmentCount: resolved.length,
          segmentLengths: resolved.map((s) => s.length),
          totalCoordinates: flat.length,
          firstCoordinate: flat[0] ?? null,
          lastCoordinate: flat.length > 0 ? flat[flat.length - 1] : null,
        },
        summary: route.summary,
        cursorFeedback: '',
      };

      entry.cursorFeedback = buildCursorFeedback(entry);
      return entry;
    }),
  };

  if (typeof window !== 'undefined') {
    (
      window as Window & { __VISUALISER_POLYLINE_DEBUG__?: VisualiserPolylineDebugPayload }
    ).__VISUALISER_POLYLINE_DEBUG__ = payload;
  }

  console.groupCollapsed(
    `${LOG_PREFIX} ${routes.length} route${routes.length === 1 ? '' : 's'} · ${payload.routes.map((r) => `${r.repName} (${r.routeGeometrySource}, ${r.resolvedForMap.totalCoordinates} coords)`).join(' · ')}`
  );
  console.log(`${LOG_PREFIX} full payload`, payload);
  for (const route of payload.routes) {
    console.log(`${LOG_PREFIX} Cursor feedback — ${route.repName}:\n${route.cursorFeedback}`);
  }
  console.log(
    `${LOG_PREFIX} Copy JSON: copy(window.__VISUALISER_POLYLINE_DEBUG__) in the console`
  );
  console.groupEnd();
}
