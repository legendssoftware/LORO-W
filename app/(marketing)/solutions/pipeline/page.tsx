import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { MarketingCta } from '@/components/marketing/marketing-shell';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.solutionPipeline.title,
  description: PAGE_COPY.solutionPipeline.description,
  path: '/solutions/pipeline',
  indexable: true,
});

export default function PipelinePage() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Sales pipeline for field teams
      </h1>
      <p className="text-zinc-400 text-lg mb-6">
        Leads, period targets, converted wins, and visit outcomes on one screen.
      </p>
      <div className="space-y-4 text-zinc-300 text-sm">
        <p>
          Field managers stop rebuilding Friday slides—quota progress and next
          actions live in LORO alongside CRM-style lead stages.
        </p>
        <p>
          Pair pipeline with{' '}
          <a href="/solutions/field-sales" className="text-purple-400 underline">
            field sales
          </a>{' '}
          modules for a complete outside-sales stack.
        </p>
      </div>
      <MarketingCta />
    </>
  );
}
