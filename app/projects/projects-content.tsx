'use client';

import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { ClientProjectsContent } from '@/app/client-portal/components/client-projects-content';

export function ProjectsContent() {
  const { backendUserData: profile } = useSessionSync();

  if (!isClientMode(profile)) {
    return (
      <main className={appPageMainClass}>
        <p className="text-muted-foreground">Projects are available for client portal users.</p>
      </main>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={appPageMainClass}>
        <ClientPortalLoading>
          {(client) => <ClientProjectsContent client={client} />}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
