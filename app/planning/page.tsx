import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PlanningContent } from './planning-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.planning.title,
  description: PAGE_COPY.planning.description,
  path: '/planning',
});

export default async function PlanningPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <PlanningContent />;
}
