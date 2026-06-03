import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { OrdersContent } from './orders-content';

export const metadata = buildPageMetadata({
  segmentTitle: 'Orders — B2B ordering workspace',
  description:
    'Create and track B2B orders linked to clients and field visits. For authorised LORO users only.',
  path: '/orders',
});

export default function OrdersPage() {
  return <OrdersContent />;
}
