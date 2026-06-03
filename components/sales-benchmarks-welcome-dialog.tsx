'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isFullDocumentRoute } from '@/lib/app-shell-routes';
import {
  LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY,
  LORO_WELCOME_SHOWN_SESSION_KEY,
} from '@/lib/client-session-keys';
import {
  MINIMUM_DAILY_REQUIREMENTS_HEADING,
  MINIMUM_DAILY_REQUIREMENTS_TABLE,
  NOTICE_CLOSING_PARAGRAPHS,
  NOTICE_EFFECTIVE_DATE,
  NOTICE_EMPHASIS_BULLETS,
  NOTICE_EMPHASIS_INTRO,
  NOTICE_GREETING,
  NOTICE_INTRO_PARAGRAPHS,
  NOTICE_SECTIONS,
  NOTICE_SUBTITLE,
  NOTICE_TITLE,
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
        className="!flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="shrink-0 bg-violet-50 px-6 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-violet-100">
            <AlertCircle className="size-7 text-violet-600" aria-hidden />
          </div>
          <DialogHeader className="gap-1 space-y-0 text-center sm:text-center">
            <DialogTitle className="text-lg font-semibold">{NOTICE_TITLE}</DialogTitle>
            <p className="text-sm font-semibold text-foreground">{NOTICE_SUBTITLE}</p>
            <DialogDescription className="text-muted-foreground text-sm">
              {NOTICE_EFFECTIVE_DATE}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-3 text-sm font-medium text-foreground">{NOTICE_GREETING}</p>

          {NOTICE_INTRO_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph} className="mb-3 text-sm text-foreground/90">
              {paragraph}
            </p>
          ))}

          <section className="mb-5">
            <p className="mb-2 text-sm font-medium text-foreground">{NOTICE_EMPHASIS_INTRO}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {NOTICE_EMPHASIS_BULLETS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="mb-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">
              {MINIMUM_DAILY_REQUIREMENTS_HEADING}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {MINIMUM_DAILY_REQUIREMENTS_TABLE.headers.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap text-xs sm:text-sm">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MINIMUM_DAILY_REQUIREMENTS_TABLE.rows.map((row) => (
                  <TableRow key={row[0]}>
                    {row.map((cell, index) => (
                      <TableCell
                        key={`${row[0]}-${index}`}
                        className={index === 0 ? 'min-w-[140px] text-xs sm:text-sm' : 'text-xs sm:text-sm'}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {NOTICE_SECTIONS.map((section) => (
            <section key={section.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-base font-semibold text-foreground">{section.title}</h3>
              {section.intro ? (
                <p className="mb-2 text-sm text-foreground/90">{section.intro}</p>
              ) : null}
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mb-2 text-sm text-foreground/90">
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {section.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="mt-4 border-t border-border pt-4">
            {NOTICE_CLOSING_PARAGRAPHS.map((paragraph) => (
              <p
                key={paragraph}
                className={
                  paragraph === 'Management'
                    ? 'text-sm font-semibold text-foreground'
                    : 'mb-2 text-sm text-foreground/90'
                }
              >
                {paragraph}
              </p>
            ))}
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-5 sm:justify-center">
          <Button
            type="button"
            variant="success"
            className="h-auto min-h-12 w-full max-w-md whitespace-normal px-4 py-3 text-center text-sm leading-snug"
            onClick={() => handleOpenChange(false)}
          >
            I have read and acknowledged it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
