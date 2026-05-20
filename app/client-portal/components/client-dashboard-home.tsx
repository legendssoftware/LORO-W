'use client';

import type { ClientProfileData } from '@/api/types/client-portal';
import { ClientAccountInfoCard } from './client-account-info-card';

export function ClientDashboardHome({ client }: { client: ClientProfileData }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground mt-1">
          Manage orders, view reports, and shop from your account portal.
        </p>
      </div>
      <ClientAccountInfoCard client={client} showQuickLinks />
    </div>
  );
}
