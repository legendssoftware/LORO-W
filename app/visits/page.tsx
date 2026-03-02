import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { VisitsContent } from './visits-content';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Visits | Start and end visits, view history',
  description: 'Start or end a visit and view your visit history. LORO visits and check-ins.',
};

export default async function VisitsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <VisitsContent />;
}
