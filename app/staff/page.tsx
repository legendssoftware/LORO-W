import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { StaffContent } from './staff-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.staff.title,
  description: PAGE_COPY.staff.description,
  path: '/staff',
});

export default async function StaffPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <StaffContent />;
}
