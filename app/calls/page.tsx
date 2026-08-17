import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CallsContent } from './calls-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.calls.title,
  description: PAGE_COPY.calls.description,
  path: '/calls',
});

export default async function CallsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <CallsContent />;
}
