import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ClaimDetailContent } from './claim-detail-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.claims.title,
  description: PAGE_COPY.claims.description,
  path: '/claims',
});

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const { userId } = await auth();
  if (!userId) redirectToSignIn(`/claims/${uid}`);

  return <ClaimDetailContent />;
}
