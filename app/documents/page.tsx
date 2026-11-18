import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { DocumentsContent } from './documents-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.documents.title,
  description: PAGE_COPY.documents.description,
  path: '/documents',
});

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/documents');
  return <DocumentsContent />;
}
