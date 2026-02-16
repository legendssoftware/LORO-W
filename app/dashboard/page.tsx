import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardContent } from './dashboard-content';

export const dynamic = 'force-dynamic';

export const metadata = {
  title:
    'Dashboard | View your attendance, check in and out, and manage your streak and leave balance',
  description:
    'View your attendance, check in and out, see your streak and leave balance. LORO dashboard for time and workforce management.',
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <DashboardContent />;
}
