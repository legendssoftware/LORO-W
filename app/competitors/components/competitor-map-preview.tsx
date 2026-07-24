'use client';

import dynamic from 'next/dynamic';

const CompetitorMapPreviewInner = dynamic(
  () =>
    import('./competitor-map-preview-inner').then((m) => ({
      default: m.CompetitorMapPreviewInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full rounded-md border bg-muted/30 animate-pulse" />
    ),
  },
);

export function CompetitorMapPreview({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name?: string;
}) {
  return (
    <CompetitorMapPreviewInner
      latitude={latitude}
      longitude={longitude}
      name={name}
    />
  );
}
