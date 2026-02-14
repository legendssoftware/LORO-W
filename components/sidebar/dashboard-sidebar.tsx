'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { useSyncClerk } from '@/api/hooks';
import {
  getAllowedRoutes,
  isStaffDashboardVisible,
  STAFF_SIDEBAR_ROUTES,
} from '@/lib/access';
import {
  BarChart3Icon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useSidebar } from './sidebar-provider';
import { cn } from '@/lib/utils';

const STAFF_ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboardIcon,
  '/staff': UsersIcon,
  '/settings': SettingsIcon,
  '/reports': BarChart3Icon,
};

const STANDARD_ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboardIcon,
  '/leads': UsersIcon,
  '/claims': BarChart3Icon,
  '/profile': SettingsIcon,
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const syncQuery = useSyncClerk({ enabled: isSignedIn ?? false });
  const profile = syncQuery.data?.profileData;

  if (!isSignedIn) return null;

  const isStaff = isStaffDashboardVisible(profile?.accessLevel);
  const routes = isStaff ? STAFF_SIDEBAR_ROUTES : getAllowedRoutes(profile?.accessLevel);
  const routeIcons = isStaff ? STAFF_ROUTE_ICONS : STANDARD_ROUTE_ICONS;

  const handleSignOut = async () => {
    setOpen(false);
    toast('See you soon! 👋', { icon: '👋', duration: 3000 });
    await signOut({ redirectUrl: '/' });
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close sidebar"
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
      />
      {/* Panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-background shadow-lg transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-lg font-bold text-foreground">LORO</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
            className="rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <XIcon className="size-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-auto p-3">
          {routes.map((route) => {
            const Icon = routeIcons[route.path];
            const isActive =
              pathname === route.path || pathname?.startsWith(route.path + '/');

            return (
              <Link
                key={route.path}
                href={route.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {Icon && <Icon className="size-5 shrink-0" />}
                {route.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOutIcon className="size-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
