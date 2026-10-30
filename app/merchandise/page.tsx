import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MerchandiseContent } from './merchandise-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.merchandise.title,
  description: PAGE_COPY.merchandise.description,
  path: '/merchandise',
});

export default async function MerchandisePage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/merchandise');

  return <MerchandiseContent />;
}
