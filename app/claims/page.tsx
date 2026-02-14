import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Claims</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your claims. Content coming soon.
        </p>
      </main>
    </div>
  );
}
