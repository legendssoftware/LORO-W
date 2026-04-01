import type { Metadata } from 'next';
import { getSiteUrl } from './site-url';
import { DEFAULT_OG_IMAGE_PATH, siteName } from './page-metadata';

export { getSiteUrl } from './site-url';
export { buildPageMetadata, DEFAULT_OG_IMAGE_PATH, siteName } from './page-metadata';
export { PAGE_COPY } from './routes';

const defaultTitleSegment =
  "SA's all-in-one HR, time, payroll & leave — one platform";
const defaultDescription =
  'Run HR, attendance, payroll, leave and field performance in one stack. Built for South African teams—local support, measurable outcomes, less admin.';

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
  'sales pipeline',
  'field workforce',
].join(', ');

const author = {
  name: 'Brandon N Kawu',
  url: 'https://www.linkedin.com/in/brandonnkawu/',
  email: 'brandonnkawu01@gmail.com',
};

const rootOgTitle = `${defaultTitleSegment} | ${siteName}`;

/**
 * Default app metadata: SA-focused SEO. Title template: `%s | LORO`.
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitleSegment,
    template: '%s | LORO',
  },
  description: defaultDescription,
  keywords,
  authors: [author],
  creator: author.name,
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    siteName: siteName,
    title: rootOgTitle,
    description: defaultDescription,
    images: [
      {
        url: DEFAULT_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: `${siteName} — workforce platform for South Africa`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: rootOgTitle,
    description: defaultDescription,
    images: [DEFAULT_OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
  },
};
