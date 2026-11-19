import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { RoutePlanningContent } from './route-planning-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionRoutePlanning.title,
  description: PAGE_COPY.solutionRoutePlanning.description,
  path: '/solutions/route-planning',
  indexable: true,
});

export default function RoutePlanningPage() {
  return <RoutePlanningContent />;
}
