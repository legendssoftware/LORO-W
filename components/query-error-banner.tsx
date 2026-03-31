'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QueryErrorBannerProps = {
  message: string;
  onRetry: () => void;
  className?: string;
};

/**
 * Inline failure state for TanStack Query: message + retry. Pair with `skipErrorToast` on Axios meta to avoid duplicate toasts.
 */
export function QueryErrorBanner({
  message,
  onRetry,
  className,
}: QueryErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground',
        className
      )}
    >
      <AlertCircle
        className="size-5 shrink-0 text-destructive"
        aria-hidden
      />
      <p className="min-w-0 flex-1">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
