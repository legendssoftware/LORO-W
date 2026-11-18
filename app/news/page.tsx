import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { NewsContent } from './news-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.news.title, description: PAGE_COPY.news.description, path: '/news' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/news');
  return <NewsContent />;
}
