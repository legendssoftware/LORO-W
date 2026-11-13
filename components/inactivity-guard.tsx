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
import { IDLE_SIGNOUT_MS, isIdleExpired } from '@/lib/inactivity';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

function getTimeoutMs(): number {
  const minutes = Number(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES) || 0;
  return minutes * 60 * 1000;
}

/**
 * Listens for inactivity and shows a dialog to confirm staying logged in.
 * Idle time is measured from the last activity timestamp, including time the
 * tab spent hidden or the machine spent asleep. The 30s sign-out countdown
 * runs only while the tab is visible.
 * Only active when signed in and NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES > 0.
 */
export function InactivityGuard() {
  const { isSignedIn, isLoaded } = useAuth();
  const { performSignOut } = useSignOut();
  const timeoutMs = getTimeoutMs();
  const [showDialog, setShowDialog] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(IDLE_SIGNOUT_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stayingLoggedInRef = useRef(false);
  const signOutStartedRef = useRef(false);
  const showDialogRef = useRef(false);
  const lastActivityAtRef = useRef(0);
  const performSignOutRef = useRef(performSignOut);

  useEffect(() => {
    performSignOutRef.current = performSignOut;
  }, [performSignOut]);

  useEffect(() => {
    showDialogRef.current = showDialog;
  }, [showDialog]);

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const beginSignOut = useCallback(() => {
    if (signOutStartedRef.current) return;
    signOutStartedRef.current = true;
    showDialogRef.current = false;
    setShowDialog(false);
    clearCountdown();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void performSignOutRef.current();
  }, [clearCountdown]);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setCountdownSeconds(IDLE_SIGNOUT_MS / 1000);
    countdownTimerRef.current = setTimeout(() => {
      countdownTimerRef.current = null;
      beginSignOut();
    }, IDLE_SIGNOUT_MS);
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
  }, [beginSignOut, clearCountdown]);

  const openIdleDialog = useCallback(() => {
    if (showDialogRef.current) return;
    showDialogRef.current = true;
    setShowDialog(true);
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      startCountdown();
    }
  }, [startCountdown]);

  const armTimer = useCallback(() => {
    clearIdleTimer();
    if (timeoutMs <= 0 || !isSignedIn || showDialogRef.current) return;
    const remaining = timeoutMs - (Date.now() - lastActivityAtRef.current);
    if (remaining <= 0) {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        openIdleDialog();
      }
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      openIdleDialog();
    }, remaining);
  }, [clearIdleTimer, isSignedIn, openIdleDialog, timeoutMs]);

  useEffect(() => {
    if (!isSignedIn || timeoutMs <= 0) return;

    lastActivityAtRef.current = Date.now();
    clearIdleTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (document.visibilityState !== 'visible') return;
      openIdleDialog();
    }, timeoutMs);

    const handleActivity = () => {
      if (showDialogRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (isIdleExpired(lastActivityAtRef.current, Date.now(), timeoutMs)) {
        openIdleDialog();
        return;
      }
      lastActivityAtRef.current = Date.now();
      armTimer();
    };

    const handleVisibility = () => {
      const visible = document.visibilityState === 'visible';
      if (!visible) {
        clearCountdown();
        return;
      }
      if (showDialogRef.current) {
        startCountdown();
        return;
      }
      if (isIdleExpired(lastActivityAtRef.current, Date.now(), timeoutMs)) {
        openIdleDialog();
        return;
      }
      armTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      clearIdleTimer();
    };
  }, [armTimer, clearCountdown, clearIdleTimer, isSignedIn, openIdleDialog, startCountdown, timeoutMs]);

  const handleStayLoggedIn = () => {
    stayingLoggedInRef.current = true;
    showDialogRef.current = false;
    lastActivityAtRef.current = Date.now();
    clearCountdown();
    setShowDialog(false);
    armTimer();
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
    beginSignOut();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (!stayingLoggedInRef.current) {
        beginSignOut();
      }
      stayingLoggedInRef.current = false;
      showDialogRef.current = false;
      setShowDialog(false);
    } else {
      showDialogRef.current = true;
      setShowDialog(true);
    }
  };

  if (!isLoaded || !isSignedIn || timeoutMs <= 0) return null;

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
