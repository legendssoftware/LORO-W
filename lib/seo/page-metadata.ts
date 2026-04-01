import type { Metadata } from 'next';
import { getSiteUrl } from './site-url';

export const siteName = 'LORO';

/** Default OG image route from `app/opengraph-image.tsx` (metadataBase resolves relative URLs). */
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';

type BuildPageMetadataInput = {
  segmentTitle: string;
  description: string;
  /** Set `false` to omit canonical (e.g. not-found). */
  path: string | false;
  indexable?: boolean;
  keywords?: string;
};

export function buildPageMetadata({
  segmentTitle,
  description,
  path,
  indexable = false,
  keywords,
}: BuildPageMetadataInput): Metadata {
  const base = getSiteUrl();
  const pathname =
    path === false ? false : path.startsWith('/') ? path : `/${path}`;
  const canonical = pathname === false ? base : `${base}${pathname}`;
  const ogTitle = `${segmentTitle} | ${siteName}`;

  return {
    title: segmentTitle,
    description,
    ...(keywords ? { keywords } : {}),
    ...(pathname === false
      ? {}
      : {
          alternates: {
            canonical,
          },
        }),
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: 'website',
      locale: 'en_ZA',
      siteName,
      images: [
        {
          url: DEFAULT_OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${siteName} — ${segmentTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [DEFAULT_OG_IMAGE_PATH],
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}
