import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { LeadsContent } from './leads-content';
import { LeadsActions } from './leads-actions';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.leads.title,
  description: PAGE_COPY.leads.description,
  path: '/leads',
});

export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="container mx-auto px-2 py-8 sm:px-6 flex flex-col gap-6 w-full">
      <div data-tour="leads-page-header">
        <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View, track, and manage your sales leads.
        </p>
      </div>

      <LeadsActions />

      <LeadsContent />
    </div>
  );
}
