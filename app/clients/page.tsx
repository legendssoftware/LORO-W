import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ClientsContent } from './clients-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.clients.title,
  description: PAGE_COPY.clients.description,
  path: '/clients',
});

export default async function ClientsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ClientsContent />;
}
