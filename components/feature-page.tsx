'use client';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';
import { appPageMainClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';

/** Shown when the signed-in role cannot open the route. */
export function FeatureDenied({ title }: { title: string }) {
  const { t } = useTranslation('screens');
  return (
    <main className={appPageMainClass}>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('pages.denied')}</p>
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
  /** Sits before the action buttons so the primary button stays last. */
  search?: ReactNode;
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
  search,
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
  const hasToolbar = Boolean(actions || filters || search);

  return (
    <main className={cn(appPageMainClass, 'flex flex-col gap-4')}>
      <div {...tourAttr(tourId, 'page-header')}>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {hasToolbar ? (
        <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto" {...tourAttr(tourId, 'filters')}>
            {filters}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2" {...tourAttr(tourId, 'actions')}>
            {search}
            {actions}
          </div>
        </div>
      ) : null}
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
