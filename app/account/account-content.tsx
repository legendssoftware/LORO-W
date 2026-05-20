'use client';

import { useState } from 'react';
import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { ClientAccountInfoCard } from '@/app/client-portal/components/client-account-info-card';
import { ClientInfoSections } from '@/app/client-portal/components/client-info-sections';
import { EditClientProfileForm } from '@/app/client-portal/components/edit-client-profile-form';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/hooks/use-sign-out';

export function AccountContent() {
  const { backendUserData: profile } = useSessionSync();
  const { performSignOut } = useSignOut();
  const [editing, setEditing] = useState(false);

  if (!isClientMode(profile)) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Account settings are for client portal users.</p>
      </main>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Account</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing((e) => !e)}>
              {editing ? 'View profile' : 'Edit profile'}
            </Button>
            <Button variant="ghost" onClick={() => void performSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
        <ClientPortalLoading>
          {(client) => (
            <div className="space-y-6">
              <ClientAccountInfoCard client={client} />
              {editing ? (
                <EditClientProfileForm client={client} onSaved={() => setEditing(false)} />
              ) : (
                <ClientInfoSections client={client} />
              )}
            </div>
          )}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
