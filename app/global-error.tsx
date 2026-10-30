'use client';

import { Button } from '@/components/ui/button';
import './globals.css';

/**
 * Catches errors in the root layout. Must define its own html/body.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center font-sans text-foreground antialiased">
        <h1 className="text-lg font-semibold text-destructive">Application error</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      </body>
    </html>
  );
}
