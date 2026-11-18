import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { SalesTipsContent } from './sales-tips-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.salesTips.title, description: PAGE_COPY.salesTips.description, path: '/sales-tips' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/sales-tips');
  return <SalesTipsContent />;
}
