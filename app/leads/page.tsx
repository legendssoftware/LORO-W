import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LeadsContent } from './leads-content';
import { LeadsActions } from './leads-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leads | Manage and track your sales leads',
  description: 'View, track, and manage your sales leads. LORO lead management.',
};

export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="container mx-auto px-2 py-8 sm:px-6 flex flex-col gap-6 w-full">
      <div>
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
