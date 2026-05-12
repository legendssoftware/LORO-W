import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PlanningContent } from './planning-content';
import { PlanningActions } from './planning-actions';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.planning.title,
  description: PAGE_COPY.planning.description,
  path: '/planning',
});

export default async function PlanningPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="container mx-auto flex w-full flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-8">
      <div data-tour="planning-page-header">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Planning</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          View, track, and manage your tasks.
        </p>
      </div>

      <PlanningActions />

      <PlanningContent />
    </div>
  );
}
