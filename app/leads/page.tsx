import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LeadsContent } from './leads-content';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leads | Manage and track your sales leads',
  description: 'View, track, and manage your sales leads. LORO lead management.',
};

export default async function LeadsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <LeadsContent />;
}
