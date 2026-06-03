import type { Metadata } from 'next';
import { getSiteUrl } from './site-url';
import { DEFAULT_OG_IMAGE_PATH, siteName } from './page-metadata';

export { getSiteUrl } from './site-url';
export { buildPageMetadata, DEFAULT_OG_IMAGE_PATH, siteName } from './page-metadata';
export { PAGE_COPY } from './routes';
export { HOME_FAQS, buildFaqPageJsonLd } from './home-faqs';
export {
  MARKETING_STATIC_PATHS,
  marketingChangeFrequency,
  marketingPathPriority,
} from './marketing-paths';
export { APP_DISALLOW_PATHS } from './app-disallow-paths';
export { buildLandingJsonLd } from './build-landing-json-ld';

const defaultTitleSegment =
  'Field sales software for South Africa — visits, routes & pipeline';
const defaultDescription =
  'LORO unifies field visits, route planning, pipeline, and ERP-ready orders for South African B2B teams. Web and mobile for reps and managers.';

const keywords = [
  'field sales software South Africa',
  'field sales management',
  'visit tracking software',
  'route planning field sales',
  'mobile sales app',
  'B2B field sales',
  'sales pipeline software',
  'ERP integration field sales',
  'Sage field sales',
  'retail execution',
  'competitor mapping',
  'South African businesses',
  'sales CRM',
  'field rep app',
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
        alt: `${siteName} — field sales software for South Africa`,
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
