'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
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
      <main className={cn(appPageMainClass, 'lg:max-w-[88rem]')}>
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="orders-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Orders</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track quotations and orders by status
            </p>
          </div>
          <Button
            asChild
            className={cn(
              'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
              'bg-violet-600 text-white hover:bg-violet-700',
              'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
              '[&_svg]:text-white focus-visible:ring-violet-500/40'
            )}
          >
            <Link href="/store">
              <Plus className="size-4" />
              New Order
            </Link>
          </Button>
        </div>
        <ClientPortalLoading>
          {(client) => <ClientOrdersContent client={client} />}
        </ClientPortalLoading>
      </main>
    </div>
  );
}
