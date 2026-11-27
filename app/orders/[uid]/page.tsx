import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata } from '@/lib/seo';
import { LoadingSpinner } from '@/components/loading-spinner';
import { OrderDetailContent } from './order-detail-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: 'Order — B2B ordering workspace',
  description: 'View and update an order you placed from the LORO store.',
  path: '/orders',
});

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const { userId } = await auth();
  if (!userId) redirectToSignIn(`/orders/${uid}`);

  return (
    <Suspense fallback={<LoadingSpinner wrapperClassName="py-16" />}>
      <OrderDetailContent />
    </Suspense>
  );
}
