'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSignOut } from '@/hooks/use-sign-out';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'focus'] as const;
const AUTO_SIGNOUT_MS = 30 * 1000;

function getTimeoutMs(): number {
  const minutes = Number(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES) || 0;
  return minutes * 60 * 1000;
}

/**
 * Listens for inactivity and shows a dialog to confirm staying logged in.
 * If the user does not confirm, performs full sign-out (session clear + Clerk).
 * Only active when signed in and NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES > 0.
 */
export function InactivityGuard() {
  const { isSignedIn } = useAuth();
  const { performSignOut } = useSignOut();
  const timeoutMs = getTimeoutMs();
  const [showDialog, setShowDialog] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(30);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stayingLoggedInRef = useRef(false);
  const performSignOutRef = useRef(performSignOut);
  performSignOutRef.current = performSignOut;

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutMs <= 0 || !isSignedIn || showDialog) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setShowDialog(true);
    }, timeoutMs);
  }, [timeoutMs, isSignedIn, showDialog]);

  useEffect(() => {
    if (!isSignedIn || timeoutMs <= 0) return;

    resetTimer();

    const handleActivity = () => {
      if (showDialog) return;
      resetTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity);
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSignedIn, timeoutMs, showDialog, resetTimer]);

  useEffect(() => {
    if (!showDialog) return;
    setCountdownSeconds(30);
    countdownTimerRef.current = setTimeout(() => {
      countdownTimerRef.current = null;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      void performSignOutRef.current();
      setShowDialog(false);
    }, AUTO_SIGNOUT_MS);
    countdownIntervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [showDialog]);

  const handleStayLoggedIn = () => {
    stayingLoggedInRef.current = true;
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setShowDialog(false);
    resetTimer();
  };

  const handleSignOut = () => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    void performSignOut();
    setShowDialog(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (!stayingLoggedInRef.current) {
        void performSignOut();
      }
      stayingLoggedInRef.current = false;
      setShowDialog(false);
    } else {
      setShowDialog(true);
    }
  };

  if (!isSignedIn || timeoutMs <= 0) return null;

  return (
    <AlertDialog open={showDialog} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ve been inactive. Confirm to stay logged in, or you&apos;ll be signed out after 30 seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {showDialog && (
          <div className="flex justify-center py-6">
            <span
              className="text-6xl font-bold tabular-nums text-foreground tracking-tight"
              aria-live="polite"
              aria-atomic="true"
            >
              {countdownSeconds}s
            </span>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStayLoggedIn}>Stay logged in</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleSignOut}>
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
