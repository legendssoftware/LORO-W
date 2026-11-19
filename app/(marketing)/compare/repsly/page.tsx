import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CompareRepslyContent } from './compare-repsly-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.compareRepsly.title,
  description: PAGE_COPY.compareRepsly.description,
  path: '/compare/repsly',
  indexable: true,
});

export default function CompareRepslyPage() {
  return <CompareRepslyContent />;
}
