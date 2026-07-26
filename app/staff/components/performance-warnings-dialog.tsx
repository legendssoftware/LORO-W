'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogCloseButton } from '@/components/dialog-close-button';
import { PerformanceWarningsCard } from '@/app/staff/users/[ref]/settings/performance-warnings-card';

export function PerformanceWarningsDialog({
  open,
  onOpenChange,
  userRef,
  userName,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRef: string | null;
  userName?: string;
  canManage: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col w-full max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[85vh] p-4 sm:p-6 pt-12 pr-14"
      >
        <div className="absolute top-4 right-4 z-10">
          <DialogCloseButton />
        </div>
        <DialogHeader>
          <DialogTitle>
            {userName ? `Warnings — ${userName}` : 'Performance warnings'}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 flex-1 pt-2">
          <PerformanceWarningsCard
            userRef={userRef}
            canManage={canManage}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
