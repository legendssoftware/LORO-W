import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { WellbeingContent } from './wellbeing-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.wellbeing.title,
  description: PAGE_COPY.wellbeing.description,
  path: '/wellbeing',
});

export default async function WellbeingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <WellbeingContent />;
}
