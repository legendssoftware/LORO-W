'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAcknowledgePerformanceWarning } from '@/api/hooks';
import type { TargetWarningsPayload } from '@/api/endpoints/user';
import {
  getPerformanceWarningCopy,
  type PerformanceWarningLevel,
} from '@/lib/performance-warning-content';
import { cn } from '@/lib/utils';

const tierAccent: Record<
  PerformanceWarningLevel,
  { header: string; iconWrap: string; icon: string; border: string; buttonClass: string }
> = {
  1: {
    header: 'bg-emerald-50',
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-700',
    border: 'border-emerald-200/80',
    buttonClass: '',
  },
  2: {
    header: 'bg-amber-50',
    iconWrap: 'bg-amber-100',
    icon: 'text-amber-800',
    border: 'border-amber-300',
    buttonClass: 'bg-amber-600 hover:bg-amber-600/90 text-white',
  },
  3: {
    header: 'bg-red-50',
    iconWrap: 'bg-red-100',
    icon: 'text-red-700',
    border: 'border-red-300',
    buttonClass: 'bg-destructive hover:bg-destructive/90 text-white',
  },
};

export interface PerformanceWarningWelcomeDialogProps {
  flowActive: boolean;
  userRef: string | null;
  employeeName: string;
  targetWarnings: TargetWarningsPayload | null | undefined;
}

export function PerformanceWarningWelcomeDialog({
  flowActive,
  userRef,
  employeeName,
  targetWarnings,
}: PerformanceWarningWelcomeDialogProps) {
  const [open, setOpen] = useState(false);
  const acknowledge = useAcknowledgePerformanceWarning(userRef);

  const level = targetWarnings?.level;
  const pending =
    flowActive &&
    !!userRef &&
    !!level &&
    level > (targetWarnings?.acknowledgedLevel ?? 0);

  useEffect(() => {
    setOpen(!!pending);
  }, [pending]);

  if (!level || !pending) {
    return null;
  }

  const tier = tierAccent[level as PerformanceWarningLevel];
  const copy = getPerformanceWarningCopy(level as PerformanceWarningLevel, employeeName);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        data-performance-warning-open=""
        overlayClassName="z-[11000]"
        className={cn(
          '!flex max-h-[min(92vh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
          'z-[11001]',
          'border-2',
          tier.border
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className={cn('shrink-0 px-6 pt-6 pb-4 text-center sm:pt-8', tier.header)}>
          <div
            className={cn(
              'mx-auto mb-4 flex size-14 items-center justify-center rounded-full',
              tier.iconWrap
            )}
          >
            {level >= 2 ? (
              <AlertTriangle className={cn('size-7', tier.icon)} aria-hidden />
            ) : (
              <Phone className={cn('size-7', tier.icon)} aria-hidden />
            )}
          </div>
          <DialogHeader className="gap-1 space-y-0 text-center sm:text-center">
            <DialogTitle className="text-lg font-semibold leading-snug">{copy.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground whitespace-pre-line text-sm">
              {copy.intro}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {copy.bullets.map((line) => (
              <li key={line} className="text-foreground/90">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{copy.footerNote}</p>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border px-6 py-5 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant={level === 1 ? 'success' : 'default'}
            disabled={acknowledge.isPending}
            className={cn(
              'h-auto min-h-12 w-full whitespace-normal px-4 py-3 text-center text-sm leading-snug sm:w-full sm:max-w-md',
              level !== 1 && tier.buttonClass
            )}
            onClick={() => {
              if (!userRef) return;
              void acknowledge.mutateAsync().then(() => setOpen(false));
            }}
          >
            I have read and I understand and acknowledge the warning.
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
