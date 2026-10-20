import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { TakeoffDetailContent } from '../takeoff-detail-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.takeoff.title,
  description: PAGE_COPY.takeoff.description,
  path: '/takeoff',
});

export default async function TakeoffDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { uid } = await params;
  return <TakeoffDetailContent uid={Number(uid)} />;
}
