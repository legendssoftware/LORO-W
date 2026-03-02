'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Displays the suggested next action from attendance status (e.g. "End Shift", "Start Shift").
 * Shows a skeleton when loading and no nextAction yet.
 */
export function DashboardNextAction({
  nextAction,
  isLoading,
}: {
  nextAction?: string | null;
  isLoading?: boolean;
}) {
  if (isLoading && (nextAction == null || nextAction === '')) {
    return (
      <div className="text-center text-sm font-medium text-muted-foreground">
        <Skeleton className="mx-auto h-4 w-32 rounded-md" />
      </div>
    );
  }
  if (nextAction == null || nextAction === '') return null;
  return (
    <div className="text-center text-sm font-medium text-muted-foreground">
      Next: <span className="text-foreground">{nextAction}</span>
    </div>
  );
}
