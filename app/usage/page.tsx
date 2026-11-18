import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { UsageContent } from './usage-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.usage.title, description: PAGE_COPY.usage.description, path: '/usage' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/usage');
  return <UsageContent />;
}
