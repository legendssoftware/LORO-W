import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PipelineIntro } from './pipeline-intro';
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
    <div className="container mx-auto flex w-full flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-8">
      <PipelineIntro />

      <PipelineContent />
    </div>
  );
}
