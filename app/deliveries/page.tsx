import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { DeliveriesListContent } from './deliveries-list-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.deliveries.title,
  description: PAGE_COPY.deliveries.description,
  path: '/deliveries',
});

export default async function DeliveriesPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/deliveries');
  return <DeliveriesListContent />;
}
