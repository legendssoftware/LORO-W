import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { TakeoffListContent } from './takeoff-list-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.takeoff.title,
  description: PAGE_COPY.takeoff.description,
  path: '/takeoff',
});

export default async function TakeoffPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/takeoff');
  return <TakeoffListContent />;
}
