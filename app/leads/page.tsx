import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { LeadsContent } from './leads-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.leads.title,
  description: PAGE_COPY.leads.description,
  path: '/leads',
});

export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <LeadsContent />;
}
