import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { AssetsContent } from './assets-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.assets.title,
  description: PAGE_COPY.assets.description,
  path: '/assets',
});

export default async function AssetsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <AssetsContent />;
}
