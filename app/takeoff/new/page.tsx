import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { redirectToSignIn } from '@/lib/auth-redirect';

export const dynamic = 'force-dynamic';

/** Creation happens in a dialog on the takeoff list. */
export default async function NewTakeoffPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/takeoff/new');
  redirect('/takeoff');
}
