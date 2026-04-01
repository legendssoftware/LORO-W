/** Canonical origin for metadata, OG URLs, and sitemap. Set in production via NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl(): string {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL?.trim()
      : undefined;
  return (raw && raw.replace(/\/$/, '')) || 'http://localhost:3000';
}
