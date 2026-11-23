'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StandardEntityGridProps {
  children: ReactNode;
  className?: string;
  /** Optional tour anchor. */
  dataTour?: string;
}

/**
 * Responsive card grid for FeatureShell list pages in grid view mode.
 */
export function StandardEntityGrid({ children, className, dataTour }: StandardEntityGridProps) {
  return (
    <div
      className={cn('grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
      data-tour={dataTour}
    >
      {children}
    </div>
  );
}

export interface StandardEntityCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Simple bordered card used by standard grid views.
 */
export function StandardEntityCard({ children, className, onClick }: StandardEntityCardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm',
        interactive && 'cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </div>
  );
}
