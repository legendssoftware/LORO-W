'use client';

import type { ReactNode } from 'react';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';

/** Shown when the signed-in role cannot open the route. */
export function FeatureDenied({ title }: { title: string }) {
  return (
    <main className={appPageMainClass}>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You do not have access to this page.
      </p>
    </main>
  );
}

type FeatureShellProps = {
  title: string;
  description: string;
  /** Prefix for driver.js anchors: `{tourId}-page-header`, `-actions`, `-filters`, `-content`. */
  tourId?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
};

function tourAttr(tourId: string | undefined, suffix: string): { 'data-tour'?: string } {
  if (!tourId) return {};
  return { 'data-tour': `${tourId}-${suffix}` };
}

/**
 * Claims-style page shell: header, filters, loading, error, and empty states.
 */
export function FeatureShell({
  title,
  description,
  tourId,
  actions,
  filters,
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyMessage,
  children,
}: FeatureShellProps) {
  const status = getErrorStatus(error);
  const message =
    status === 403
      ? 'Your organisation may need this feature enabled.'
      : getQueryErrorMessage(error);

  return (
    <main className={cn(appPageMainClass, 'flex flex-col gap-4')}>
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        {...tourAttr(tourId, 'page-header')}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2" {...tourAttr(tourId, 'actions')}>
            {actions}
          </div>
        ) : null}
      </div>
      {filters ? <div {...tourAttr(tourId, 'filters')}>{filters}</div> : null}
      {isLoading ? <LoadingSpinner wrapperClassName="py-12" /> : null}
      {isError ? (
        <div {...tourAttr(tourId, 'settled')}>
          <QueryErrorBanner message={message} onRetry={onRetry} />
        </div>
      ) : null}
      {!isLoading && !isError && isEmpty ? (
        <p
          className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground"
          {...tourAttr(tourId, 'content')}
        >
          {emptyMessage}
        </p>
      ) : null}
      {!isLoading && !isError && !isEmpty ? (
        <div className="flex flex-col gap-4" {...tourAttr(tourId, 'content')}>
          {children}
        </div>
      ) : null}
    </main>
  );
}
