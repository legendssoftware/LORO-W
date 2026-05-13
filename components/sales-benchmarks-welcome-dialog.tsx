'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isFullDocumentRoute } from '@/lib/app-shell-routes';
import {
  LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY,
  LORO_WELCOME_SHOWN_SESSION_KEY,
} from '@/lib/client-session-keys';
import {
  SALES_BENCHMARKS_SECTIONS,
  SALES_BENCHMARKS_TITLE,
} from '@/lib/sales-benchmarks-welcome-content';
import { useSessionStore } from '@/store/session-store';
import { isGeneralWorkerWorkforce } from '@/lib/workforce-guards';

function persistDismiss(sessionId: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(LORO_WELCOME_SHOWN_SESSION_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

export function SalesBenchmarksWelcomeDialog({
  deferForPendingWarning = false,
}: {
  /**
   * When true, benchmarks modal stays closed until user target has settled (no fetch error) and any
   * blocking performance warning is cleared.
   */
  deferForPendingWarning?: boolean;
} = {}) {
  const pathname = usePathname() ?? '';
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const [open, setOpen] = useState(false);
  const profile = useSessionStore((s) => s.profileData);

  const inAppShell = !isFullDocumentRoute(pathname);
  const isDashboard = pathname === '/dashboard';

  useEffect(() => {
    if (isGeneralWorkerWorkforce(profile?.workforceType)) {
      setOpen(false);
      return;
    }
    if (!isLoaded || !isSignedIn || !inAppShell || !isDashboard || !sessionId) {
      return;
    }
    if (deferForPendingWarning) {
      setOpen(false);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const dismissedFor = sessionStorage.getItem(LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY);
      if (dismissedFor === sessionId) return;
    } catch {
      return;
    }
    setOpen(true);
  }, [isLoaded, isSignedIn, inAppShell, isDashboard, sessionId, pathname, deferForPendingWarning, profile?.workforceType]);

  const handleOpenChange = (next: boolean) => {
    if (!next && sessionId) {
      persistDismiss(sessionId);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-violet-50 px-6 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-violet-100">
            <Phone className="size-7 text-violet-600" aria-hidden />
          </div>
          <DialogHeader className="gap-1 space-y-0 text-center sm:text-center">
            <DialogTitle className="text-lg font-semibold">{SALES_BENCHMARKS_TITLE}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Use these as a guide for daily cold calling and quoting.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(50vh,360px)] overflow-y-auto px-6 py-4">
          {SALES_BENCHMARKS_SECTIONS.map((section) => (
            <section key={section.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-base font-semibold text-foreground">{section.title}</h3>
              <p className="mb-2 text-sm text-foreground/90">{section.intro}</p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {section.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4 sm:justify-center">
          <Button
            type="button"
            variant="success"
            className="w-full text-center whitespace-normal sm:w-auto"
            onClick={() => handleOpenChange(false)}
          >
            I have read and acknowledged it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
