import nextDynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';

export const dynamic = 'force-dynamic';

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
