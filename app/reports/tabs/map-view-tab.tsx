'use client';

import dynamic from 'next/dynamic';
import { useMapReport } from '@/api/hooks/use-map-report';
import { LoadingSpinner } from '@/components/loading-spinner';

const ReportsMapInner = dynamic(
  () => import('./reports-map-inner').then((m) => m.ReportsMapInner),
  { ssr: false, loading: () => <LoadingSpinner wrapperClassName="min-h-[400px]" /> }
);

/**
 * Map View tab: fetches map data from GET /reports/map (MapDataReportGenerator)
 * and renders a Leaflet map with all markers (workers, clients, leads, etc.).
 */
export function MapViewTab() {
  const { data, isLoading, isError, error } = useMapReport(undefined, { enabled: true });

  if (isLoading) {
    return <LoadingSpinner wrapperClassName="min-h-[400px]" />;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive min-h-[200px] flex items-center justify-center">
        <p className="text-sm">
          {error instanceof Error ? error.message : 'Failed to load map data.'}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        No map data available.
      </div>
    );
  }

  return (
    <div className="min-h-[500px] h-[70vh] overflow-hidden flex flex-col">
      <ReportsMapInner data={data} className="flex-1 min-h-0" />
    </div>
  );
}
