'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useClerk,
  useUser,
} from '@clerk/nextjs';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FaqModal } from '@/components/faq-modal';
import { KnowledgeIcon, LayoutDashboardIcon, PowerIcon, VapiSupportCallIcon } from '@/lib/icons';
import { useSyncClerk } from '@/api/hooks';
import { useSidebar } from '@/components/sidebar/sidebar-provider';

const WELCOME_KEY = 'loro_welcome_shown';

export function AppHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const welcomeShown = useRef(false);
  const [faqOpen, setFaqOpen] = useState(false);
  useSyncClerk({ enabled: isSignedIn ?? false });
  const sidebar = useSidebar();

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
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {isSignedIn ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={sidebar.toggle}
        >
          <LayoutDashboardIcon className="size-6" />
        </Button>
      ) : (
        <Link
          href="/"
          className="text-xl font-bold text-foreground"
        >
          LORO
        </Link>
      )}

      <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Vapi support call"
            >
              <VapiSupportCallIcon className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="FAQ / Knowledge base"
              onClick={() => setFaqOpen(true)}
            >
              <KnowledgeIcon className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
              onClick={() => signOut({ redirectUrl: '/' })}
            >
              <PowerIcon className="size-5" />
            </Button>
          </div>
        </SignedIn>
      </div>
      <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />
    </header>
  );
}
