import type { MetadataRoute } from 'next';
import { APP_DISALLOW_PATHS, getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...APP_DISALLOW_PATHS],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
