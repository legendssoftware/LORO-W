import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ApprovalsContent } from './approvals-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.approvals.title,
  description: PAGE_COPY.approvals.description,
  path: '/approvals',
});

export default async function ApprovalsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ApprovalsContent />;
}
