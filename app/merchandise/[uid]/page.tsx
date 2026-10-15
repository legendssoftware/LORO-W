import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MerchandiseDetailContent } from './merchandise-detail-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.merchandise.title,
  description: PAGE_COPY.merchandise.description,
  path: '/merchandise',
});

export default async function MerchandiseDetailPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <MerchandiseDetailContent />;
}
