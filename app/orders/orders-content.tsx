'use client';

import Link from 'next/link';
import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { cn } from '@/lib/utils';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import { ClientOrdersContent } from '@/app/client-portal/components/client-orders-content';
import { Button } from '@/components/ui/button';

export function OrdersContent() {
  const { backendUserData: profile } = useSessionSync();

  if (!isClientMode(profile)) {
    return (
      <main className={appPageMainClass}>
        <p className="text-muted-foreground">Orders are available for client portal users.</p>
      </main>
    );
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={cn(appPageMainClass, 'max-w-[1600px] lg:max-w-[1600px]')}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track quotations and orders by status
            </p>
          </div>
          <Link href="/store">
            <Button>New Order</Button>
          </Link>
        </div>
        <ClientPortalLoading>
          {(client) => <ClientOrdersContent client={client} />}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
