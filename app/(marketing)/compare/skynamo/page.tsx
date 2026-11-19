import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CompareSkynamoContent } from './compare-skynamo-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.compareSkynamo.title,
  description: PAGE_COPY.compareSkynamo.description,
  path: '/compare/skynamo',
  indexable: true,
});

export default function CompareSkynamoPage() {
  return <CompareSkynamoContent />;
}
