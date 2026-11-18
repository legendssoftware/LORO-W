import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { WarningsContent } from './warnings-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.warnings.title,
  description: PAGE_COPY.warnings.description,
  path: '/warnings',
});

export default async function WarningsPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/warnings');
  return <WarningsContent />;
}
