import type { MetadataRoute } from 'next';

/** Indexable public marketing routes (no trailing slash). */
export const MARKETING_STATIC_PATHS = [
  '/',
  '/privacy-policy',
  '/about',
  '/pricing',
  '/customers',
  '/integrations',
  '/integrations/sage',
  '/integrations/acumatica',
  '/integrations/sap',
  '/solutions/field-sales',
  '/solutions/visit-tracking',
  '/solutions/route-planning',
  '/solutions/pipeline',
  '/solutions/competitor-intelligence',
  '/solutions/workforce',
  '/compare/repsly',
  '/compare/skynamo',
  '/compare/zoho-crm',
  '/blog',
  '/onboarding',
] as const;

export type MarketingStaticPath = (typeof MARKETING_STATIC_PATHS)[number];

export function marketingPathPriority(path: string): number {
  if (path === '/') return 1;
  if (path === '/blog') return 0.85;
  if (path.startsWith('/solutions/')) return 0.9;
  if (path.startsWith('/compare/')) return 0.75;
  if (path.startsWith('/integrations')) return 0.8;
  if (path === '/pricing') return 0.85;
  return 0.6;
}

export function marketingChangeFrequency(
  path: string,
): MetadataRoute.Sitemap[number]['changeFrequency'] {
  if (path === '/' || path === '/blog') return 'weekly';
  if (path.startsWith('/solutions/')) return 'monthly';
  if (path.startsWith('/compare/')) return 'monthly';
  return 'yearly';
}
