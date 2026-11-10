import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { StoreOperationsContent } from './store-operations-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.storeOperations.title,
  description: PAGE_COPY.storeOperations.description,
  path: '/store-operations',
});

export default async function StoreOperationsPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/store-operations');
  return <StoreOperationsContent />;
}
