import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PipelineContent } from './pipeline-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.pipeline.title,
  description: PAGE_COPY.pipeline.description,
  path: '/pipeline',
});

export default async function PipelinePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="container mx-auto px-2 py-8 sm:px-6 flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Targets, leads, and visits — scoped to you.
        </p>
      </div>

      <PipelineContent />
    </div>
  );
}
