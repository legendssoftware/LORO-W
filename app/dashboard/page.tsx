import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { DashboardContent } from './dashboard-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.dashboard.title,
  description: PAGE_COPY.dashboard.description,
  path: '/dashboard',
});

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/dashboard');

  return <DashboardContent />;
}
