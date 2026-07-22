import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PayslipsContent } from './payslips-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.payslips.title,
  description: PAGE_COPY.payslips.description,
  path: '/payslips',
});

export default async function PayslipsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <PayslipsContent />;
}
