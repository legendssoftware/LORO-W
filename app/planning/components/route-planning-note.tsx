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
import { useTranslation } from 'react-i18next';

/** Opens the nightly route-planning explanation. The tour targets this button. */
export function RoutePlanningNote() {
  const { t } = useTranslation('screens');
  const [open, setOpen] = useState(false);
  const routeTitle = t('pages.planning.routeTitle');

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        aria-label={routeTitle}
        data-tour="planning-route-note"
        onClick={() => setOpen(true)}
      >
        <Info className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{routeTitle}</DialogTitle>
            <DialogDescription>{t('pages.planning.routeNote')}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
