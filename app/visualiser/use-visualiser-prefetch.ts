'use client';

/** No-op prefetch while reports/map API is rebuilt on the server. */
export function useVisualiserPrefetch(_options: {
  enabled: boolean;
  visualiserMode: 'org' | 'self';
  profile: unknown;
}) {
  // intentionally empty
}
