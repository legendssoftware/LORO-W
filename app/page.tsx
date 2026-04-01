import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { buildPageMetadata, getSiteUrl, PAGE_COPY, siteName } from '@/lib/seo';

const homeMeta = buildPageMetadata({
  segmentTitle: PAGE_COPY.home.title,
  description: PAGE_COPY.home.description,
  path: '/',
  indexable: true,
});

export const metadata = {
  ...homeMeta,
  title: { absolute: `${PAGE_COPY.home.title} | ${siteName}` },
};

const orgId = `${getSiteUrl()}#organization`;

const landingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${getSiteUrl()}#website`,
      name: 'LORO',
      url: getSiteUrl(),
      description: PAGE_COPY.home.description,
      publisher: { '@id': orgId },
      inLanguage: 'en-ZA',
    },
    {
      '@type': 'Organization',
      '@id': orgId,
      name: 'LORO',
      url: getSiteUrl(),
      description: PAGE_COPY.home.description,
      areaServed: {
        '@type': 'Country',
        name: 'South Africa',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'LORO',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      description: PAGE_COPY.home.description,
      areaServed: {
        '@type': 'Country',
        name: 'South Africa',
      },
    },
  ],
} as const;

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      <LandingPage />
    </>
  );
}
