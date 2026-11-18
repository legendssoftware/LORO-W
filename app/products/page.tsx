import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ProductsContent } from './products-content';
export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({ segmentTitle: PAGE_COPY.products.title, description: PAGE_COPY.products.description, path: '/products' });
export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/products');
  return <ProductsContent />;
}
