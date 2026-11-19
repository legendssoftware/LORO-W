import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CompetitorIntelContent } from './competitor-intel-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionCompetitorIntel.title,
  description: PAGE_COPY.solutionCompetitorIntel.description,
  path: '/solutions/competitor-intelligence',
  indexable: true,
});

export default function CompetitorIntelPage() {
  return <CompetitorIntelContent />;
}
