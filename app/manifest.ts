import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  const base = getSiteUrl();
  return {
    name: 'LORO — Field sales software',
    short_name: 'LORO',
    description:
      'Field visits, routes, and pipeline for South African B2B teams.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#7c3aed',
    lang: 'en-ZA',
    icons: [
      {
        src: `${base}/icon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
