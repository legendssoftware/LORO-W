import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadsContent } from './leads-content';

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
      {/* ADDED: matching top-level page container from VisitsPage */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View, track, and manage your sales leads.
        </p>
      </div>

      {/* ADDED: prominent status block (copied structure from VisitsPage) */}
      <div className="flex w-full flex-col items-center gap-4">
        <div className="w-full rounded-xl border-2 p-4 sm:p-6 border-green-600 bg-green-600/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-base font-medium text-foreground sm:text-lg">
              View and manage your sales leads.
            </p>
            <Button
              className="gap-2 min-h-14 w-full border-0 bg-green-600 px-6 text-lg text-white hover:bg-green-700 sm:w-auto"
              size="lg"
            >
              <Plus className="size-4" />
              Create lead
            </Button>
          </div>
        </div>
      </div>

      {/* ADDED: Leads History header section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Leads History</h2>
      </div>

      <LeadsContent />
    </div>
  );
}
