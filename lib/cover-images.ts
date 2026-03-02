/**
 * Cover image paths under public/images/covers/.
 * Uses 1.webp through 7.webp for landing hero and feature sections.
 */

const COVER_BASE = '/images/covers';

export const COVER_IMAGE_PATHS = [
  `${COVER_BASE}/1.webp`,
  `${COVER_BASE}/2.webp`,
  `${COVER_BASE}/3.webp`,
  `${COVER_BASE}/4.webp`,
  `${COVER_BASE}/5.webp`,
  `${COVER_BASE}/6.webp`,
  `${COVER_BASE}/7.webp`,
] as const;

/** Deterministic LCP image for the hero center slot (2.webp). Use for preload and center hero only. */
export const HERO_CENTER_IMAGE = COVER_IMAGE_PATHS[1];

export type CoverImagePath = (typeof COVER_IMAGE_PATHS)[number];

/** Fallback URLs when a cover image fails to load (e.g. not yet added to public). */
export const COVER_FALLBACK_URLS = [
  'https://picsum.photos/id/10/800/600',
  'https://picsum.photos/id/20/400/400',
  'https://picsum.photos/id/30/600/400',
] as const;

/** Fisher–Yates shuffle; returns new array. */
function shuffle<T>(array: readonly T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deterministic initial cover paths for slots 0, 1, 2. Used for SSR and first client render
 * to avoid hydration mismatch; shuffle is applied client-side after mount.
 */
export function getDefaultCoverSlots(): CoverImagePath[] {
  return COVER_IMAGE_PATHS.slice(0, 3);
}

/**
 * Returns a shuffled copy of cover paths for random assignment to hero and feature sections.
 * Call only on the client after mount (e.g. in useEffect) to get stable assignment per session.
 */
export function getShuffledCoverPaths(): CoverImagePath[] {
  return shuffle(COVER_IMAGE_PATHS);
}
