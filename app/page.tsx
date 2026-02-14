import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{
        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 33%, #EC4899 66%, #F59E0B 100%)',
      }}
    >
      <h1 className="mb-4 text-3xl font-bold text-white">LORO</h1>
      <p className="mb-8 max-w-md text-center text-white/90">
        Automate What Matters, Control What Counts
      </p>
      <Button asChild size="lg" className="rounded-xl bg-white px-8 py-4 font-semibold text-purple-600 hover:bg-white/90">
        <Link href="/onboarding">Get Started</Link>
      </Button>
    </div>
  );
}
