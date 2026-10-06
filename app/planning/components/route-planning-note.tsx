'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROUTE_PLANNING_NOTE, ROUTE_PLANNING_NOTE_TITLE } from '@/lib/route-planning-note';

/** Opens the nightly route-planning explanation. The tour targets this button. */
export function RoutePlanningNote() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        aria-label={ROUTE_PLANNING_NOTE_TITLE}
        data-tour="planning-route-note"
        onClick={() => setOpen(true)}
      >
        <Info className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{ROUTE_PLANNING_NOTE_TITLE}</DialogTitle>
            <DialogDescription>{ROUTE_PLANNING_NOTE}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
