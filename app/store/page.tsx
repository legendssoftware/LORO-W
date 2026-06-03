import { buildPageMetadata } from '@/lib/seo';
import { StorePageContent } from './store-page-content';

export const metadata = buildPageMetadata({
  segmentTitle: 'Store — B2B procurement workspace',
  description:
    'Browse and order from your LORO B2B store. Authorised users only.',
  path: '/store',
});

export default function StorePage() {
  return <StorePageContent />;
}
