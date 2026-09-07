import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PerformanceContent } from './performance-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.performance.title,
  description: PAGE_COPY.performance.description,
  path: '/performance',
});

export default async function PerformancePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <PerformanceContent />;
}
