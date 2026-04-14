'use client';

import { format, formatDistanceToNow } from 'date-fns';
import type { LeadActivityLogItem } from '@/api/types/leads';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  formatLeadActivitySummaryForRow,
  leadActivityActionPresentation,
  resolveActivityUserProfile,
  type ActivityActorLookupUser,
} from '@/lib/lead-activity-display';

export function LeadHistoryEntry({
  entry,
  activityTimelineUsers,
}: {
  entry: LeadActivityLogItem;
  activityTimelineUsers: ActivityActorLookupUser[];
}) {
  const pres = leadActivityActionPresentation(entry.action);
  const summary = formatLeadActivitySummaryForRow(entry);
  const actor = resolveActivityUserProfile(entry, activityTimelineUsers);
  const at = entry.at ? new Date(entry.at) : null;
  const when =
    at && !Number.isNaN(at.getTime()) ? format(at, 'MMM d, yyyy · h:mm a') : '—';
  const relative =
    at && !Number.isNaN(at.getTime()) ? formatDistanceToNow(at, { addSuffix: true }) : '';

  return (
    <li className="flex gap-3 rounded-md border border-border/60 bg-muted/20 p-2.5 text-sm">
      {actor ? (
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={actor.photoURL ?? undefined} alt={actor.name} />
          <AvatarFallback className="text-[10px]">
            {actor.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-violet-100 text-[10px] font-medium text-violet-900">
            L
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge
            variant="outline"
            className={`border px-1.5 py-0 text-[10px] font-medium ${pres.className}`}
          >
            {pres.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{when}</span>
          {relative ? (
            <span className="text-xs text-muted-foreground">({relative})</span>
          ) : null}
        </div>
        {actor ? (
          <p className="text-xs font-medium text-foreground">{actor.name}</p>
        ) : (
          <p className="text-xs font-medium text-violet-900">LORO</p>
        )}
        <p className="break-words whitespace-pre-wrap text-muted-foreground">{summary}</p>
      </div>
    </li>
  );
}
