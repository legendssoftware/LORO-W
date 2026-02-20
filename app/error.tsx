'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Route-level error UI. Catches errors in this segment and below; prevents full app crash.
 * Try again calls reset(); Go home navigates to dashboard.
 */
export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-destructive font-medium">Something went wrong.</p>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="secondary">
          Go home
        </Button>
      </div>
    </div>
  );
}
