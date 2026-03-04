import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { StaffContent } from './staff-content';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <StaffContent />;
}
