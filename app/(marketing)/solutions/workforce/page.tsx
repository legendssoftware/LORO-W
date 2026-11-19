import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { WorkforceContent } from './workforce-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionWorkforce.title,
  description: PAGE_COPY.solutionWorkforce.description,
  path: '/solutions/workforce',
  indexable: true,
});

export default function WorkforcePage() {
  return <WorkforceContent />;
}
