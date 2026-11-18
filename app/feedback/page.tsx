import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { FeedbackContent } from './feedback-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.feedback.title,
  description: PAGE_COPY.feedback.description,
  path: '/feedback',
});

export default async function FeedbackPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/feedback');
  return <FeedbackContent />;
}
