'use client';

import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { StoreContent } from '@/app/client-portal/components/store-content';

export function StorePageContent() {
  const { backendUserData: profile } = useSessionSync();

  if (!isClientMode(profile)) {
    return (
      <main className={appPageMainClass}>
        <p className="text-muted-foreground">Store is available for client portal users.</p>
      </main>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={`${appPageMainClass} lg:max-w-[88rem]`}>
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="store-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Store
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Browse products, add to your cart, and submit a quotation.
            </p>
          </div>
        </div>
        <ClientPortalLoading>
          {(client) => <StoreContent client={client} />}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
