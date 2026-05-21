'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { DIALOG_CLOSE_BUTTON_CLASS } from '@/lib/modal-overlay';

export function DialogCloseButton({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn(DIALOG_CLOSE_BUTTON_CLASS, className)}
      aria-label="Close"
    >
      <XIcon className={cn('size-4', iconClassName)} />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}
