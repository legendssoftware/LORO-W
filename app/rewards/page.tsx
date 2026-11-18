import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { RewardsContent } from './rewards-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.rewards.title, description: PAGE_COPY.rewards.description, path: '/rewards' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/rewards');
  return <RewardsContent />;
}
