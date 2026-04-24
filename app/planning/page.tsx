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
    <div className="container mx-auto px-2 py-8 sm:px-6 flex flex-col gap-6 w-full">
      <div data-tour="planning-page-header">
        <h1 className="text-2xl font-semibold text-foreground">Planning</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View, track, and manage your tasks.
        </p>
      </div>

      <PlanningActions />

      <PlanningContent />
    </div>
  );
}
