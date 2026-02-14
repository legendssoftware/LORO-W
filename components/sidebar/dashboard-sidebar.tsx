'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useSessionSync, getSessionSyncQueryKey } from '@/api/hooks';
import { useSessionStore } from '@/store/session-store';
import {
  getAllowedRoutes,
  isStaffDashboardVisible,
  STAFF_SIDEBAR_ROUTES,
} from '@/lib/access';
import {
  KnowledgeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  VapiSupportCallIcon,
  XIcon,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { FaqModal } from '@/components/faq-modal';
import { useSidebar } from './sidebar-provider';
import { cn } from '@/lib/utils';

const ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboardIcon,
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [faqOpen, setFaqOpen] = useState(false);
  const { backendUserData: profile } = useSessionSync();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    setOpen(false);
    toast('See you soon! 👋', { icon: '👋', duration: 3000 });
    queryClient.removeQueries({ queryKey: getSessionSyncQueryKey() });
    useSessionStore.getState().endSession();
    await signOut({ redirectUrl: '/' });
  };

  const closeSidebar = () => setOpen(false);

  if (!isSignedIn) return null;

  const isStaff = isStaffDashboardVisible(profile?.accessLevel);
  const routes = isStaff ? STAFF_SIDEBAR_ROUTES : getAllowedRoutes(profile?.accessLevel);
  const routeIcons = ROUTE_ICONS;

  return (
    <>
      {/* Mobile backdrop: only on small screens when sidebar is open */}
      <button
        type="button"
        aria-label="Close sidebar"
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        )}
        onClick={closeSidebar}
      />
      {/* Sidebar: overlay on mobile (toggle), always visible on md+ */}
      <aside
        className={cn(
          'flex h-svh w-64 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out',
          'fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:z-40',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <span className="text-lg font-bold text-sidebar-foreground">LORO</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="md:hidden rounded-full size-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <XIcon className="size-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3">
          {routes.map((route) => {
            const Icon = routeIcons[route.path];
            const isActive =
              pathname === route.path || pathname?.startsWith(route.path + '/');

            return (
              <Link
                key={route.path}
                href={route.path}
                onClick={closeSidebar}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {Icon && <Icon className="size-5 shrink-0" />}
                {route.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Vapi support call"
          >
            <VapiSupportCallIcon className="size-5 shrink-0" />
            Support call
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="FAQ / Knowledge base"
            onClick={() => setFaqOpen(true)}
          >
            <KnowledgeIcon className="size-5 shrink-0" />
            FAQ / Knowledge base
          </Button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOutIcon className="size-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
      <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />
    </>
  );
}
