import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { DeliveryDetailContent } from '../delivery-detail-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.deliveries.title,
  description: PAGE_COPY.deliveries.description,
  path: '/deliveries',
});

export default async function DeliveryDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const { userId } = await auth();
  if (!userId) redirectToSignIn(`/deliveries/${uid}`);
  return <DeliveryDetailContent uid={Number(uid)} />;
}
