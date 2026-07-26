import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
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
    <div className={cn(appPageMainClass, 'flex w-full flex-col gap-4 sm:gap-6')}>
      <PipelineIntro />

      <PipelineContent />
    </div>
  );
}
