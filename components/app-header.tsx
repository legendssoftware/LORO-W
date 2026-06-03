'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/nextjs';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LayoutDashboardIcon, PowerIcon } from '@/lib/icons';
import { useSessionSync } from '@/api/hooks';
import { useSignOut } from '@/hooks/use-sign-out';
import {
  LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY,
  LORO_WELCOME_SHOWN_SESSION_KEY,
} from '@/lib/client-session-keys';
import { isGeneralWorkerWorkforce } from '@/lib/workforce-guards';
import { useSidebar } from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/mode-toggle';

/** Human-readable label for access level (e.g. owner → Owner). */
function roleLabel(accessLevel: string | undefined): string {
  if (!accessLevel?.trim()) return 'User';
  const s = accessLevel.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function AppHeader() {
  const { sessionId } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();
  const { openUserProfile } = useClerk();
  const { performSignOut } = useSignOut();
  const welcomeShown = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { backendUserData } = useSessionSync();
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const sidebarOpen = isMobile ? openMobile : open;
  const accessLevel = backendUserData?.accessLevel;
  const role = roleLabel(accessLevel);

  const handleSignOut = () => {
    setIsSigningOut(true);
    void performSignOut();
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || welcomeShown.current) return;
    if (
      typeof window !== 'undefined' &&
      sessionStorage.getItem(LORO_WELCOME_SHOWN_SESSION_KEY)
    )
      return;

    // Sales benchmarks dialog on /dashboard is the welcome for that session; skip toast until dismissed for this Clerk session.
    const skipBenchmarksDismissWait = isGeneralWorkerWorkforce(backendUserData?.workforceType);
    if (!skipBenchmarksDismissWait && typeof window !== 'undefined' && isSignedIn) {
      try {
        if (!sessionId) {
          return;
        }
        const dismissedFor = sessionStorage.getItem(LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY);
        if (dismissedFor !== sessionId) {
          return;
        }
      } catch {
        // storage unavailable — allow toast below
      }
    }

    welcomeShown.current = true;
    sessionStorage.setItem(LORO_WELCOME_SHOWN_SESSION_KEY, '1');
    const name =
      user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? 'there';
    toast(`Welcome back, ${name}! 👋`, {
      icon: '✨',
      duration: 4000,
    });
  }, [isLoaded, isSignedIn, user, sessionId, backendUserData?.workforceType]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-transparent px-4 py-3">
      {isSignedIn ? (
        sidebarOpen ? (
          <div className="size-9 shrink-0" aria-hidden />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open sidebar"
            onClick={toggleSidebar}
            className="shrink-0"
          >
            <LayoutDashboardIcon className="size-6" />
          </Button>
        )
      ) : (
        <Link
          href="/"
          className="text-xl font-bold text-foreground"
        >
          Home
        </Link>
      )}

      <div className="flex flex-1 items-center justify-end gap-3">
        <ModeToggle />
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

      <Dialog open={isSigningOut} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[9999] bg-black"
          className="z-[9999] flex min-w-[280px] max-w-[calc(100%-2rem)] items-center justify-center bg-black text-white rounded-lg px-8 py-6 shadow-xl border-0 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <DialogTitle className="text-white text-lg font-medium">
            Signing you out 👋
          </DialogTitle>
        </DialogContent>
      </Dialog>
    </header>
  );
}
