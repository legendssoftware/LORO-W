import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { LoyaltyContent } from './loyalty-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.loyalty.title, description: PAGE_COPY.loyalty.description, path: '/loyalty' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/loyalty');
  return <LoyaltyContent />;
}
