import nextDynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.reports.title,
  description: PAGE_COPY.reports.description,
  path: '/reports',
});

const ReportsContent = nextDynamic(
  () =>
    import('./reports-content').then((mod) => ({ default: mod.ReportsContent })),
  {
    loading: () => (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    ),
  }
);

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ReportsContent />;
}
