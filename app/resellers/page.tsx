import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ResellersContent } from './resellers-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.resellers.title, description: PAGE_COPY.resellers.description, path: '/resellers' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/resellers');
  return <ResellersContent />;
}
