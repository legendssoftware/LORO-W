'use client';

import { useState } from 'react';
import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { ClientAccountInfoCard } from '@/app/client-portal/components/client-account-info-card';
import { ClientInfoSections } from '@/app/client-portal/components/client-info-sections';
import { EditClientProfileForm } from '@/app/client-portal/components/edit-client-profile-form';
import { Button } from '@/components/ui/button';

export function AccountContent() {
  const { backendUserData: profile } = useSessionSync();
  const [editing, setEditing] = useState(false);

  if (!isClientMode(profile)) {
    return (
      <main className={appPageMainClass}>
        <p className="text-muted-foreground">Account settings are for client portal users.</p>
      </main>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={appPageMainClass}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6" data-tour="account-page-header">
          <h1 className="text-2xl font-semibold">Account</h1>
          <Button variant="outline" data-tour="account-edit" onClick={() => setEditing((e) => !e)}>
            {editing ? 'View profile' : 'Edit profile'}
          </Button>
        </div>
        <ClientPortalLoading>
          {(client) => (
            <div className="space-y-6">
              <div data-tour="account-profile">
                <ClientAccountInfoCard client={client} />
              </div>
              <div data-tour="account-details">
              {editing ? (
                <EditClientProfileForm client={client} onSaved={() => setEditing(false)} />
              ) : (
                <ClientInfoSections client={client} />
              )}
              </div>
            </div>
          )}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
