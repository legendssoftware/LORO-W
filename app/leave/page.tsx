import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { LeaveContent } from './leave-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.leave.title,
  description: PAGE_COPY.leave.description,
  path: '/leave',
});

export default async function LeavePage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/leave');
  return <LeaveContent />;
}
