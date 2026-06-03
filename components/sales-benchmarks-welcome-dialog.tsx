'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DEFAULT_SALES_BENCHMARKS_LOCALE,
  SALES_BENCHMARKS_BY_LOCALE,
  SALES_BENCHMARKS_LANG_ATTR,
  SALES_BENCHMARKS_LOCALE_OPTIONS,
  type SalesBenchmarksLocale,
} from '@/lib/sales-benchmarks-welcome';
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
  const [locale, setLocale] = useState<SalesBenchmarksLocale>(DEFAULT_SALES_BENCHMARKS_LOCALE);
  const profile = useSessionStore((s) => s.profileData);

  const content = SALES_BENCHMARKS_BY_LOCALE[locale];

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
    setLocale(DEFAULT_SALES_BENCHMARKS_LOCALE);
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
        className="!flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden border-2 border-red-600 p-0 sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative shrink-0 bg-red-50 px-6 pt-8 pb-4 text-center dark:bg-red-950/40">
          <div className="absolute top-4 right-4 z-10">
            <Select
              value={locale}
              onValueChange={(value) => setLocale(value as SalesBenchmarksLocale)}
            >
              <SelectTrigger
                className="h-8 w-[140px] border-red-200 bg-background text-xs"
                aria-label="Notice language"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALES_BENCHMARKS_LOCALE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="size-7 text-red-700 dark:text-red-400" aria-hidden />
          </div>
          <DialogHeader className="gap-1 space-y-0 text-center sm:text-center">
            <DialogTitle className="text-lg font-semibold">{content.noticeTitle}</DialogTitle>
            <p className="text-sm font-semibold text-foreground">{content.noticeSubtitle}</p>
            <DialogDescription className="text-muted-foreground text-sm">
              {content.effectiveDate}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
          lang={SALES_BENCHMARKS_LANG_ATTR[locale]}
        >
          <p className="mb-3 text-sm font-medium text-foreground">{content.greeting}</p>

          {content.introParagraphs.map((paragraph, index) => (
            <p key={`intro-${index}`} className="mb-3 text-sm text-foreground/90">
              {paragraph}
            </p>
          ))}

          <section className="mb-5">
            <p className="mb-2 text-sm font-medium text-foreground">{content.emphasisIntro}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {content.emphasisBullets.map((line, index) => (
                <li key={`emphasis-${index}`}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="mb-5">
            <h3 className="mb-3 text-base font-semibold text-foreground">
              {content.minimumDailyHeading}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {content.table.headers.map((header, index) => (
                    <TableHead key={`header-${index}`} className="whitespace-nowrap text-xs sm:text-sm">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.table.rows.map((row, rowIndex) => (
                  <TableRow key={`row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={`row-${rowIndex}-cell-${cellIndex}`}
                        className={
                          cellIndex === 0 ? 'min-w-[140px] text-xs sm:text-sm' : 'text-xs sm:text-sm'
                        }
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {content.sections.map((section, sectionIndex) => (
            <section key={`section-${sectionIndex}`} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-base font-semibold text-foreground">{section.title}</h3>
              {section.intro ? (
                <p className="mb-2 text-sm text-foreground/90">{section.intro}</p>
              ) : null}
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p key={`section-${sectionIndex}-p-${paragraphIndex}`} className="mb-2 text-sm text-foreground/90">
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {section.bullets.map((line, bulletIndex) => (
                    <li key={`section-${sectionIndex}-b-${bulletIndex}`}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="mt-4 border-t border-border pt-4">
            {content.closingParagraphs.map((paragraph, index) => (
              <p
                key={`closing-${index}`}
                className={
                  paragraph === content.closingSignature
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
            {content.acknowledgeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
