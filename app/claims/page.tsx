import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ClaimsContent } from './claims-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.claims.title,
  description: PAGE_COPY.claims.description,
  path: '/claims',
});

export default async function ClaimsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ClaimsContent />;
}
