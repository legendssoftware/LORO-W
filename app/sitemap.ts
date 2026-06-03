import type { MetadataRoute } from 'next';
import { getAllBlogSlugs } from '@/lib/blog';
import {
  getSiteUrl,
  MARKETING_STATIC_PATHS,
  marketingChangeFrequency,
  marketingPathPriority,
} from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = MARKETING_STATIC_PATHS.map(
    (path) => ({
      url: `${base}${path === '/' ? '' : path}`,
      lastModified,
      changeFrequency: marketingChangeFrequency(path),
      priority: marketingPathPriority(path),
    }),
  );

  const blogEntries: MetadataRoute.Sitemap = getAllBlogSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [...staticEntries, ...blogEntries];
}
