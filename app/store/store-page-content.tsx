'use client';

import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { StoreContent } from '@/app/client-portal/components/store-content';

export function StorePageContent() {
  const { backendUserData: profile } = useSessionSync();

  if (!isClientMode(profile)) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Store is available for client portal users.</p>
      </main>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold mb-6">Store</h1>
        <ClientPortalLoading>
          {(client) => <StoreContent client={client} />}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
