import nextDynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.visualiser.title,
  description: PAGE_COPY.visualiser.description,
  path: '/visualiser',
});

const VisualiserContent = nextDynamic(
  () =>
    import('./visualiser-content').then((mod) => ({
      default: mod.VisualiserContent,
    })),
  {
    loading: () => (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    ),
  }
);

export default async function VisualiserPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <VisualiserContent />;
}
