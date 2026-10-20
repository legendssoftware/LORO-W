'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TakeoffBuilderContent } from '@/app/takeoff/takeoff-builder-content';

export interface CreateTakeoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Creates a takeoff from the list without leaving the page. */
export function CreateTakeoffDialog({ open, onOpenChange }: CreateTakeoffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>New takeoff</DialogTitle>
          <DialogDescription>Choose systems, enter measurements, review the quantities, then save.</DialogDescription>
        </DialogHeader>
        <TakeoffBuilderContent
          open={open}
          onSaved={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
