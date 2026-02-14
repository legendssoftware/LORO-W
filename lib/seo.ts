import type { Metadata } from 'next';

const siteName = 'LORO';
const title =
  'LORO | HR, Payroll & Time Management for South African Businesses';
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
 */
export const defaultMetadata: Metadata = {
  title,
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
