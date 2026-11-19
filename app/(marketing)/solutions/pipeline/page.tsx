import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PipelineContent } from './pipeline-content';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionPipeline.title,
  description: PAGE_COPY.solutionPipeline.description,
  path: '/solutions/pipeline',
  indexable: true,
});

export default function PipelinePage() {
  return <PipelineContent />;
}
