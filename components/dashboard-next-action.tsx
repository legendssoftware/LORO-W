'use client';

/**
 * Displays the suggested next action from attendance status (e.g. "End Shift", "Start Shift").
 */
export function DashboardNextAction({ nextAction }: { nextAction?: string | null }) {
  if (nextAction == null || nextAction === '') return null;
  return (
    <p className="text-center text-sm font-medium text-muted-foreground">
      Next: <span className="text-foreground">{nextAction}</span>
    </p>
  );
}
