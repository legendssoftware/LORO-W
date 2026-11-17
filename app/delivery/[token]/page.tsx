import { buildPageMetadata } from '@/lib/seo';
import { DeliveryTracking } from './delivery-tracking';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: 'Delivery',
  description: 'Track a delivery and leave a rating after it is completed',
  path: '/delivery',
  indexable: false,
});

export default async function DeliveryTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <DeliveryTracking token={token} />;
}
