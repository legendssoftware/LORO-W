'use client';

import { cn } from '@/lib/utils';

/**
 * Reusable double-ring loading spinner (from Uiverse.io by devAaus).
 * Use for token loading, page loading, or any async wait state.
 */
export function LoadingSpinner({
  className,
  wrapperClassName,
}: {
  /** Optional class for the outer wrapper (e.g. py-12, min-h). */
  wrapperClassName?: string;
  /** Optional class for the spinner container (flex wrapper). */
  className?: string;
} = {}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 w-full flex items-center justify-center',
        wrapperClassName
      )}
    >
      <div
        className={cn(
          'w-20 h-20 border-4 border-transparent text-purple-400 text-4xl animate-spin flex items-center justify-center border-t-purple-400 rounded-full',
          className
        )}
      >
        <div className="w-16 h-16 border-4 border-transparent text-purple-700 text-2xl animate-spin flex items-center justify-center border-t-purple-700 rounded-full" />
      </div>
    </div>
  );
}
