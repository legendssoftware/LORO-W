import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { LandingHeroSeo } from '@/components/landing-hero-seo';
import {
  buildLandingJsonLd,
  buildPageMetadata,
  PAGE_COPY,
  siteName,
} from '@/lib/seo';

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

const landingJsonLd = buildLandingJsonLd(PAGE_COPY.home.description);

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <>
      <LandingHeroSeo />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      <LandingPage />
    </>
  );
}
