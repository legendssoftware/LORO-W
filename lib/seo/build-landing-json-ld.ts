import { buildFaqPageJsonLd, HOME_FAQS } from './home-faqs';
import { getSiteUrl } from './site-url';

export function buildLandingJsonLd(description: string) {
  const siteUrl = getSiteUrl();
  const orgId = `${siteUrl}#organization`;
  const websiteId = `${siteUrl}#website`;
  const appId = `${siteUrl}#software`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: 'LORO',
        url: siteUrl,
        description,
        publisher: { '@id': orgId },
        inLanguage: 'en-ZA',
      },
      {
        '@type': 'Organization',
        '@id': orgId,
        name: 'LORO',
        url: siteUrl,
        description,
        areaServed: {
          '@type': 'Country',
          name: 'South Africa',
        },
      },
      {
        '@type': ['SoftwareApplication', 'MobileApplication'],
        '@id': appId,
        name: 'LORO',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description,
        url: siteUrl,
        areaServed: {
          '@type': 'Country',
          name: 'South Africa',
        },
        featureList: [
          'Field visit tracking',
          'Route planning',
          'Sales pipeline and leads',
          'Client and competitor mapping',
          'ERP integration',
          'Mobile field sales app',
        ],
      },
      buildFaqPageJsonLd(HOME_FAQS, siteUrl),
    ],
  };
}
