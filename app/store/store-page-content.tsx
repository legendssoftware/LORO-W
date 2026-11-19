'use client';

import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { StoreContent } from '@/app/client-portal/components/store-content';
import { useTranslation } from 'react-i18next';

export function StorePageContent() {
  const { t } = useTranslation('screens');
  const { backendUserData: profile } = useSessionSync();

  if (!isClientMode(profile)) {
    return (
      <main className={appPageMainClass}>
        <p className="text-muted-foreground">{t('pages.store.clientOnly')}</p>
      </main>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={appPageMainClass}>
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="store-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {t('pages.store.title')}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {t('pages.store.description')}
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
