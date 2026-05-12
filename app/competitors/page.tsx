import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CompetitorsContent } from './competitors-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.competitors.title,
  description: PAGE_COPY.competitors.description,
  path: '/competitors',
});

export default async function CompetitorsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <CompetitorsContent />;
}
