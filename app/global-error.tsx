'use client';

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
      <body className="min-h-svh flex flex-col items-center justify-center gap-4 p-6 text-center font-sans antialiased">
        <h1 className="text-lg font-semibold text-red-600">Application error</h1>
        <p className="text-sm text-neutral-600">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
