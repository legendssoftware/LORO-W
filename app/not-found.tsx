import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Rendered for unknown routes and when notFound() is called.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Go to home</Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="/dashboard">Dashboard</Link>
      </Button>
    </div>
  );
}
