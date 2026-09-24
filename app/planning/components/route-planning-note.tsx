import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ROUTE_PLANNING_NOTE, ROUTE_PLANNING_NOTE_TITLE } from '@/lib/route-planning-note';
import { cn } from '@/lib/utils';

interface RoutePlanningNoteProps {
  /** When true, the tour highlights this copy. Only one instance on the page should set this. */
  tourAnchor?: boolean;
  className?: string;
}

/** Explains nightly ERP assignment and weekday route planning. */
export function RoutePlanningNote({ tourAnchor = false, className }: RoutePlanningNoteProps) {
  return (
    <Alert className={cn('shrink-0', className)} data-tour={tourAnchor ? 'planning-route-note' : undefined}>
      <Info />
      <AlertTitle>{ROUTE_PLANNING_NOTE_TITLE}</AlertTitle>
      <AlertDescription>{ROUTE_PLANNING_NOTE}</AlertDescription>
    </Alert>
  );
}
