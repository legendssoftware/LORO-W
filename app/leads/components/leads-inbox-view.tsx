'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useMemo } from 'react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { CalendarClock, ChevronRight, Loader2Icon, Phone } from 'lucide-react';
import type { LeadListItem } from '@/api/types/leads';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LEAD_PRIORITY_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
} from '@/lib/lead-form-utils';
import {
  effectiveLeadTouchDate,
  type LeadActivityActorLookup,
} from '@/components/leads-table/leads-table';
import { formatListLastActivitySummaryLine } from '@/lib/lead-activity-display';

function leadDisplayName(lead: LeadListItem): string {
  return lead.name?.trim() || lead.companyName?.trim() || `Lead #${lead.uid}`;
}

function leadInitials(lead: LeadListItem): string {
  const name = leadDisplayName(lead);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function optionLabel(
  options: { value: string; label: string }[],
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return options.find((o) => o.value === value)?.label ?? value;
}

function followUpBadge(lead: LeadListItem): ReactNode {
  if (!lead.nextFollowUpDate) return null;
  const d = new Date(lead.nextFollowUpDate);
  if (Number.isNaN(d.getTime())) return null;
  const overdue = d < new Date() && !isToday(d);
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 gap-1 text-[10px] font-medium',
        overdue
          ? 'border-red-300 bg-red-50 text-red-700'
          : isToday(d)
            ? 'border-violet-300 bg-violet-50 text-violet-700'
            : 'border-muted-foreground/30 text-muted-foreground'
      )}
    >
      <CalendarClock className="size-3" aria-hidden />
      {isToday(d) ? 'Follow up today' : format(d, 'MMM d')}
    </Badge>
  );
}

function isUnassignedLead(lead: LeadListItem): boolean {
  return lead.owner == null;
}

export interface LeadsInboxViewProps {
  leads: LeadListItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectedLeadUid?: number | null;
  activeCallLeadUid?: number | null;
  onLeadClick?: (lead: LeadListItem) => void;
  onEndActiveCall?: (lead: LeadListItem) => void;
  activityActorLookup?: LeadActivityActorLookup;
}

export function LeadsInboxView({
  leads,
  isLoading = false,
  emptyMessage = 'No leads match your filters.',
  selectedLeadUid,
  activeCallLeadUid = null,
  onLeadClick,
  onEndActiveCall,
}: LeadsInboxViewProps) {
  const rows = useMemo(() => {
    return [...leads]
      .map((lead) => ({ lead, unassigned: isUnassignedLead(lead) }))
      .sort((a, b) => {
        const aActive = a.lead.uid === activeCallLeadUid ? 1 : 0;
        const bActive = b.lead.uid === activeCallLeadUid ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aTouch = effectiveLeadTouchDate(a.lead)?.getTime() ?? 0;
        const bTouch = effectiveLeadTouchDate(b.lead)?.getTime() ?? 0;
        return bTouch - aTouch;
      });
  }, [leads, activeCallLeadUid]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="p-1.5" data-tour="leads-inbox">
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ lead, unassigned }, index) => {
          const selected = selectedLeadUid === lead.uid;
          const isActiveCall = activeCallLeadUid != null && lead.uid === activeCallLeadUid;
          const touch = effectiveLeadTouchDate(lead);
          const touchLabel = touch
            ? isToday(touch)
              ? formatDistanceToNow(touch, { addSuffix: true })
              : format(touch, 'MMM d')
            : null;
          const summary = formatListLastActivitySummaryLine(
            lead,
            lead.lastActivitySummary?.trim()
          );
          const img = typeof lead.image === 'string' ? lead.image.trim() : '';
          return (
            <li
              key={lead.uid}
              className={cn(
                'overflow-hidden rounded-lg border bg-card/50',
                isActiveCall
                  ? 'border-4 border-green-500 bg-green-50/60 ring-1 ring-green-500/30'
                  : 'border-border'
              )}
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left transition-colors sm:gap-3 sm:px-3',
                    'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    selected && 'bg-violet-50/80 dark:bg-violet-950/30',
                    isActiveCall && 'hover:bg-green-50/80'
                  )}
                  onClick={() => onLeadClick?.(lead)}
                  {...(index === 0 ? { 'data-tour': 'leads-first-lead-row' } : {})}
                >
                  <Avatar className="size-10 shrink-0 ring-2 ring-background sm:size-11">
                    {img ? <AvatarImage src={img} alt="" /> : null}
                    <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800 sm:text-sm">
                      {leadInitials(lead)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-foreground">
                        {leadDisplayName(lead)}
                      </span>
                      {isActiveCall ? (
                        <Badge className="shrink-0 gap-1 border-green-600 bg-green-600 text-[10px] text-white hover:bg-green-600">
                          <Phone className="size-3" aria-hidden />
                          Call in progress
                        </Badge>
                      ) : null}
                      {unassigned ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          Unassigned
                        </Badge>
                      ) : null}
                      {followUpBadge(lead)}
                    </div>
                    {lead.companyName?.trim() ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {lead.companyName.trim()}
                      </p>
                    ) : null}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {optionLabel(LEAD_STATUS_OPTIONS, lead.status) ? (
                        <span>{optionLabel(LEAD_STATUS_OPTIONS, lead.status)}</span>
                      ) : null}
                      {optionLabel(LEAD_TEMPERATURE_OPTIONS, lead.temperature) ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{optionLabel(LEAD_TEMPERATURE_OPTIONS, lead.temperature)}</span>
                        </>
                      ) : null}
                      {optionLabel(LEAD_PRIORITY_OPTIONS, lead.priority) ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{optionLabel(LEAD_PRIORITY_OPTIONS, lead.priority)}</span>
                        </>
                      ) : null}
                    </div>
                    {summary ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{summary}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 self-start">
                    {touchLabel ? (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {touchLabel}
                      </span>
                    ) : null}
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                </button>
                {isActiveCall && onEndActiveCall ? (
                  <div className="flex shrink-0 items-center border-l border-green-300 px-2 sm:px-3">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 bg-red-600 text-white hover:bg-red-700"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        onEndActiveCall(lead);
                      }}
                    >
                      <Phone className="size-3.5" />
                      End call
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
