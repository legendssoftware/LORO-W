import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { VisitTrackingContent } from './visit-tracking-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionVisitTracking.title,
  description: PAGE_COPY.solutionVisitTracking.description,
  path: '/solutions/visit-tracking',
  indexable: true,
});

export default function VisitTrackingPage() {
  return <VisitTrackingContent />;
}
