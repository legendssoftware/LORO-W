'use client';

import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { ClientProjectsContent } from '@/app/client-portal/components/client-projects-content';

export function ProjectsContent() {
  const { backendUserData: profile } = useSessionSync();

  if (!isClientMode(profile)) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Projects are available for client portal users.</p>
      </main>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold mb-6">Projects</h1>
        <ClientPortalLoading>
          {(client) => <ClientProjectsContent client={client} />}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
