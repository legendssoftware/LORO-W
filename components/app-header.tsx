'use client';

import { useEffect, useRef } from 'react';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useClerk,
  useUser,
} from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LayoutDashboardIcon, PowerIcon } from '@/lib/icons';
import { useSessionSync, getSessionSyncQueryKey } from '@/api/hooks';
import { useSessionStore } from '@/store/session-store';
import { useSidebar } from '@/components/sidebar/sidebar-provider';

const WELCOME_KEY = 'loro_welcome_shown';

/** Human-readable label for access level (e.g. owner → Owner). */
function roleLabel(accessLevel: string | undefined): string {
  if (!accessLevel?.trim()) return 'User';
  const s = accessLevel.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function AppHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const queryClient = useQueryClient();
  const welcomeShown = useRef(false);
  const { backendUserData } = useSessionSync();
  const sidebar = useSidebar();
  const accessLevel = backendUserData?.accessLevel;
  const role = roleLabel(accessLevel);

  const handleSignOut = () => {
    queryClient.removeQueries({ queryKey: getSessionSyncQueryKey() });
    useSessionStore.getState().endSession();
    signOut({ redirectUrl: '/' });
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || welcomeShown.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(WELCOME_KEY))
      return;

    welcomeShown.current = true;
    sessionStorage.setItem(WELCOME_KEY, '1');
    const name =
      user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? 'there';
    toast(`Welcome back, ${name}! 👋`, {
      icon: '✨',
      duration: 4000,
    });
  }, [isLoaded, isSignedIn, user]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-transparent px-4 py-3">
      {isSignedIn ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={sidebar.toggle}
          className="md:hidden shrink-0"
        >
          <LayoutDashboardIcon className="size-6" />
        </Button>
      ) : (
        <Link
          href="/"
          className="text-xl font-bold text-foreground"
        >
          Home
        </Link>
      )}

      <div className="flex flex-1 items-center justify-end gap-3">
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="sm">Sign up</Button>
          </SignUpButton>
        </SignedOut>

        <SignedIn>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => openUserProfile?.()}
              aria-label="Manage account"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-initial"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openUserProfile?.();
                }
              }}
            >
              <div className="min-w-0 max-w-[130px] shrink text-right sm:max-w-[200px] md:max-w-none">
                <p className="truncate text-sm font-medium text-foreground" title={user?.fullName ?? user?.firstName ?? undefined}>
                  {user?.fullName ?? user?.firstName ?? 'User'}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={user?.primaryEmailAddress?.emailAddress ?? undefined}>
                  {user?.primaryEmailAddress?.emailAddress ?? ''}
                  {role && role !== 'User' ? ` · ${role}` : ''}
                </p>
              </div>
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              className="shrink-0 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
              onClick={handleSignOut}
            >
              <PowerIcon className="size-5" />
            </Button>
          </div>
        </SignedIn>
      </div>
    </header>
  );
}
