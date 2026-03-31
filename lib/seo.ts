import type { Metadata } from 'next';

/** Canonical origin for metadata, OG URLs, and sitemap. Set in production via NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl(): string {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL?.trim()
      : undefined;
  return (raw && raw.replace(/\/$/, '')) || 'http://localhost:3000';
}

const siteName = 'LORO';
const title =
  'Home | South Africa\'s all-in-one platform for HR, time tracking, payroll, leave management and more';
const description =
  'South Africa\'s all-in-one platform: HR, employee time tracking, payroll, leave management, IoT devices, ERP-linked performance, and B2B procurement. ZAR pricing, local support.';

const keywords = [
  'HR South Africa',
  'employee time management',
  'payroll South Africa',
  'time management',
  'leave management',
  'leave tracking',
  'IoT devices',
  'performance tracking',
  'ERP integration',
  'B2B stores',
  'procurement',
  'South African businesses',
  'workforce management',
  'attendance tracking',
].join(', ');

const author = {
  name: 'Brandon N Kawu',
  url: 'https://www.linkedin.com/in/brandonnkawu/',
  email: 'brandonnkawu01@gmail.com',
};

/**
 * Default app metadata: SA-focused SEO for HR, payroll, time/leave, IoT, ERP, B2B.
 * Authored by Brandon N Kawu. Used in root layout; pages can extend or override.
 * Title uses a template so child pages get "Page name | Description | LORO".
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: title,
    template: '%s | LORO',
  },
  description,
  keywords,
  authors: [author],
  creator: author.name,
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    siteName,
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};
