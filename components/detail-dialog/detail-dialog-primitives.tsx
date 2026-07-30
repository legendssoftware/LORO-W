'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DialogCloseButton } from '@/components/dialog-close-button';

/** Standard `DialogContent` class for detail modals (padding, scroll, width). */
export const DETAIL_DIALOG_CONTENT_CLASS =
  'max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14';

/** Wider variant for lead detail (70% viewport on sm+). */
export const LEAD_DETAIL_DIALOG_CONTENT_CLASS =
  'max-w-[calc(100%-3rem)] sm:max-w-[70vw] max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14';

/** Narrower variant for nested edit/confirm dialogs. */
export const DETAIL_DIALOG_SMALL_CONTENT_CLASS =
  'max-w-[calc(100%-3rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-6 pt-12 pr-14';

/** Two-column grid for label/value pairs in detail views. */
export const DETAIL_FIELD_GRID_CLASS = 'grid grid-cols-2 gap-x-6 gap-y-3';

export function DetailSectionHeading({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <h4 className="mb-2 flex items-center gap-2 font-semibold">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      {title}
    </h4>
  );
}

export function DetailFieldRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div>
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {label}
      </span>
      <div className="font-medium">{value}</div>
    </div>
  );
}

export function DetailDialogCloseButton() {
  return <DialogCloseButton />;
}
