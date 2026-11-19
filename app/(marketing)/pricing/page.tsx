import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PricingContent } from './pricing-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.pricing.title,
  description: PAGE_COPY.pricing.description,
  path: '/pricing',
  indexable: true,
});

export default function PricingPage() {
  return <PricingContent />;
}
